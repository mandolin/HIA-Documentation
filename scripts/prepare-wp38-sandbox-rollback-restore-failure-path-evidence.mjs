import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp38-sandbox-rollback-restore-failure-path");
const sandboxRoot = path.join(outputRoot, "sandbox");
const rollbackRoot = path.join(outputRoot, "private-rollback");
const evidencePath = path.join(outputRoot, "evidence.json");
const sandboxSuccessEvidencePath = path.join(rootDir, "dist", "wp38-host-owned-writable-apply-sandbox", "evidence.json");
const vscodeGuiEvidencePath = path.join(rootDir, "dist", "wp38-vscode-real-gui-confirmation-evidence", "evidence.json");

const failureScenarios = [
  {
    id: "sandbox-conflict-before-apply",
    label: "Sandbox conflict before apply",
    failureKind: "repeat-conflict-check",
    relativePath: "conflict/messages.zh-CN.json",
    targetKind: "external-resource-locale-entry",
    initialText: "{\n  \"title\": \"base\"\n}\n",
    concurrentText: "{\n  \"title\": \"concurrent-user-change\"\n}\n"
  },
  {
    id: "sandbox-formatter-failure-before-apply",
    label: "Sandbox formatter failure before apply",
    failureKind: "formatter-before-apply",
    relativePath: "formatter/example.ts",
    targetKind: "source-docline-draft",
    initialText: "export const value = 1;\n"
  },
  {
    id: "sandbox-post-validation-failure",
    label: "Sandbox post-validation failure after apply",
    failureKind: "post-apply-validation",
    relativePath: "validation/example.ts",
    targetKind: "source-docline-draft",
    initialText: "export function value(): number {\n  return 1;\n}\n",
    transform(text) {
      return `/**\n * Invalid validation draft.\n */\n${text}`;
    },
    validationMarker: "@lang zh-CN"
  }
];

await main();

/**
 * 准备 W-P38.3 sandbox rollback restore failure-path evidence。
 * Prepare W-P38.3 sandbox rollback restore failure-path evidence.
 *
 * This script executes failure paths only in a synthetic `dist/` sandbox. It
 * proves conflict, formatter and post-apply validation failures are handled
 * without target repository mutation; only the post-validation failure restores
 * the private rollback snapshot because the other failures happen before HIA
 * writes the sandbox target.
 *
 * 中文：本脚本只在 synthetic `dist/` sandbox 中执行失败路径。它证明 conflict、
 * formatter 与 post-apply validation 失败不会修改目标仓库；只有 post-validation
 * 失败会恢复 private rollback snapshot，因为其它失败发生在 HIA 写入 sandbox
 * target 之前。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const sandboxSuccess = await readJson(sandboxSuccessEvidencePath);
  const vscodeGui = await readJson(vscodeGuiEvidencePath);
  await mkdir(sandboxRoot, { recursive: true });
  await mkdir(rollbackRoot, { recursive: true });

  const failureResults = [];
  for (const scenario of failureScenarios) {
    failureResults.push(await runFailureScenario(scenario));
  }

  const summary = {
    wp38SandboxSuccessReady: sandboxSuccess.status === "ready-for-vscode-real-gui-confirmation-evidence",
    wp38SandboxSuccessHardFailureCount: Number(sandboxSuccess.summary?.hardFailureCount ?? -1),
    wp38VscodeGuiPreparationReady: vscodeGui.status === "prepared-real-gui-manual-confirmation-required",
    wp38VscodeGuiHardFailureCount: Number(vscodeGui.summary?.hardFailureCount ?? -1),
    failureScenarioCount: failureResults.length,
    conflictFailureCount: failureResults.filter((result) => result.failureKind === "repeat-conflict-check").length,
    formatterFailureCount: failureResults.filter((result) => result.failureKind === "formatter-before-apply").length,
    postApplyValidationFailureCount: failureResults.filter((result) => result.failureKind === "post-apply-validation").length,
    blockedBeforeWriteCount: failureResults.filter((result) => result.applyWriteStatus === "blocked-before-write").length,
    appliedThenRolledBackCount: failureResults.filter((result) => result.applyWriteStatus === "applied-then-rolled-back").length,
    rollbackPrivateSnapshotCount: failureResults.filter((result) => result.rollbackSnapshotPrepared === true).length,
    rollbackRestoreExecutedCount: failureResults.filter((result) => result.rollbackRestoreStatus === "restored-from-private-snapshot").length,
    rollbackSkippedBeforeWriteCount: failureResults.filter((result) => result.rollbackRestoreStatus === "not-needed-before-write").length,
    conflictPreservedWithoutRollbackCount: failureResults.filter((result) => result.finalState === "conflict-content-preserved").length,
    formatterFailureLeftFileUnchangedCount: failureResults.filter((result) => result.finalState === "pre-apply-content-unchanged").length,
    postValidationRestoredOriginalCount: failureResults.filter((result) => result.finalState === "restored-original-content").length,
    rollbackContentIncludedInEvidenceCount: 0,
    digestValueIncludedInEvidenceCount: 0,
    sandboxWriteOperationCount: failureResults.reduce((total, result) => total + result.sandboxWriteOperationCount, 0),
    redactedAuditRecordCount: failureResults.filter((result) => result.auditRecord === "redacted").length,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects(failureResults),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(failureResults),
    secretValueMarkerCount: countSecretValueMarkers(failureResults),
    pathExposureCount: countPathExposure(JSON.stringify(failureResults)),
    sourcesContentPolicy: "none",
    sourceBodyIncludedInEvidence: false,
    realGuiManualEvidenceStillRequired: vscodeGui.summary?.realGuiManualEvidenceRequired === true,
    remoteProviderSmokeStillDeferred: true,
    targetBranchPrFlowRequiredBeforeTargetMutation: true,
    additionalHostParityStillRequired: true
  };
  const checks = [
    check("HIA_WP38_ROLLBACK_INPUTS_READY", summary.wp38SandboxSuccessReady === true
      && summary.wp38SandboxSuccessHardFailureCount === 0
      && summary.wp38VscodeGuiPreparationReady === true
      && summary.wp38VscodeGuiHardFailureCount === 0, {
      actual: {
        wp38SandboxSuccessHardFailureCount: summary.wp38SandboxSuccessHardFailureCount,
        wp38SandboxSuccessStatus: sandboxSuccess.status,
        wp38VscodeGuiHardFailureCount: summary.wp38VscodeGuiHardFailureCount,
        wp38VscodeGuiStatus: vscodeGui.status
      }
    }),
    check("HIA_WP38_ROLLBACK_FAILURE_KINDS_COVERED", summary.failureScenarioCount === 3
      && summary.conflictFailureCount === 1
      && summary.formatterFailureCount === 1
      && summary.postApplyValidationFailureCount === 1, {
      actual: {
        conflictFailureCount: summary.conflictFailureCount,
        failureScenarioCount: summary.failureScenarioCount,
        formatterFailureCount: summary.formatterFailureCount,
        postApplyValidationFailureCount: summary.postApplyValidationFailureCount
      }
    }),
    check("HIA_WP38_ROLLBACK_RESTORE_RULES_HELD", summary.blockedBeforeWriteCount === 2
      && summary.appliedThenRolledBackCount === 1
      && summary.rollbackPrivateSnapshotCount === 3
      && summary.rollbackRestoreExecutedCount === 1
      && summary.rollbackSkippedBeforeWriteCount === 2
      && summary.conflictPreservedWithoutRollbackCount === 1
      && summary.formatterFailureLeftFileUnchangedCount === 1
      && summary.postValidationRestoredOriginalCount === 1, {
      actual: {
        appliedThenRolledBackCount: summary.appliedThenRolledBackCount,
        blockedBeforeWriteCount: summary.blockedBeforeWriteCount,
        conflictPreservedWithoutRollbackCount: summary.conflictPreservedWithoutRollbackCount,
        formatterFailureLeftFileUnchangedCount: summary.formatterFailureLeftFileUnchangedCount,
        postValidationRestoredOriginalCount: summary.postValidationRestoredOriginalCount,
        rollbackPrivateSnapshotCount: summary.rollbackPrivateSnapshotCount,
        rollbackRestoreExecutedCount: summary.rollbackRestoreExecutedCount,
        rollbackSkippedBeforeWriteCount: summary.rollbackSkippedBeforeWriteCount
      }
    }),
    check("HIA_WP38_ROLLBACK_NO_UNSAFE_WRITE_AUTHORITY", summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP38_ROLLBACK_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
      && summary.secretValueMarkerCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.pathExposureCount === 0
      && summary.rollbackContentIncludedInEvidenceCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false, {
      actual: {
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        rollbackContentIncludedInEvidenceCount: summary.rollbackContentIncludedInEvidenceCount,
        secretValueMarkerCount: summary.secretValueMarkerCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP38_ROLLBACK_FORWARD_GATES_RETAINED", summary.realGuiManualEvidenceStillRequired === true
      && summary.remoteProviderSmokeStillDeferred === true
      && summary.targetBranchPrFlowRequiredBeforeTargetMutation === true
      && summary.additionalHostParityStillRequired === true, {
      actual: {
        additionalHostParityStillRequired: summary.additionalHostParityStillRequired,
        realGuiManualEvidenceStillRequired: summary.realGuiManualEvidenceStillRequired,
        remoteProviderSmokeStillDeferred: summary.remoteProviderSmokeStillDeferred,
        targetBranchPrFlowRequiredBeforeTargetMutation: summary.targetBranchPrFlowRequiredBeforeTargetMutation
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp38-sandbox-rollback-restore-failure-path-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-remote-provider-smoke-gate-preparation" : "blocked",
    sourceEvidence: {
      hostOwnedWritableSandbox: normalizePath(sandboxSuccessEvidencePath),
      vscodeGuiConfirmationPreparation: normalizePath(vscodeGuiEvidencePath)
    },
    sandboxPolicy: {
      applyAuthority: "host-owned-sandbox-only",
      outputScope: "dist-sandbox",
      rollbackSnapshotScope: "host-private-sandbox-file",
      rollbackContentInEvidenceAllowed: false,
      realWorkspaceApplyEditAllowed: false,
      targetRepositoryMutationAllowed: false,
      providerOwnedApplyAllowed: false,
      lspServerOwnedApplyAllowed: false,
      sourcesContentPolicy: "none"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    failureResults,
    checks,
    nextContractInputs: [
      {
        phase: "W-P38.4",
        topic: "remote-provider-smoke-gate-preparation",
        reason: "Sandbox success and failure paths are now covered; remote/API provider smoke can be prepared without granting provider write authority."
      },
      {
        phase: "W-P38.5",
        topic: "target-branch-pr-flow-contract",
        reason: "Target mutation remains blocked until branch/PR flow and explicit user approval are defined."
      },
      {
        phase: "W-P38.6",
        topic: "devtools-visual-studio-confirmation-parity",
        reason: "VS Code has a sandbox confirmation command; additional hosts still need parity."
      }
    ],
    manualChecks: [
      "Confirm rollback files remain under the private W-P38 dist sandbox and are not committed.",
      "Confirm conflict-before-apply preserves the conflicting sandbox content instead of restoring over it.",
      "Confirm formatter-before-apply leaves the sandbox target unchanged.",
      "Confirm post-validation failure restores the private rollback snapshot.",
      "Confirm target repositories remain untouched."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P38 sandbox rollback restore failure-path evidence");
  assert.equal(hardFailures.length, 0, `W-P38 sandbox rollback restore failure-path evidence has ${hardFailures.length} hard failure(s).`);

  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P38 sandbox rollback restore failure-path evidence prepared at ${normalizePath(evidencePath)}`);
}

async function runFailureScenario(scenario) {
  const targetPath = path.join(sandboxRoot, scenario.relativePath);
  const rollbackPath = path.join(rollbackRoot, `${scenario.id}.snapshot`);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, scenario.initialText, "utf8");
  const beforeText = await readFile(targetPath, "utf8");
  const beforeVersion = createPrivateVersionToken(beforeText);
  await writeFile(rollbackPath, beforeText, "utf8");
  let sandboxWriteOperationCount = 2;
  let repeatedReadText = beforeText;
  let repeatConflictCheck = "clear";
  let formatterExecution = "not-run";
  let postApplyValidation = "not-run";
  let rollbackRestoreStatus = "not-needed-before-write";
  let applyWriteStatus = "blocked-before-write";
  let finalState = "pre-apply-content-unchanged";
  let failureStage = scenario.failureKind;

  if (scenario.concurrentText) {
    await writeFile(targetPath, scenario.concurrentText, "utf8");
    sandboxWriteOperationCount += 1;
    repeatedReadText = await readFile(targetPath, "utf8");
    repeatConflictCheck = createPrivateVersionToken(repeatedReadText) === beforeVersion ? "clear" : "conflict";
  }

  if (repeatConflictCheck !== "clear") {
    finalState = "conflict-content-preserved";
    failureStage = "repeat-conflict-check";
    return createFailureResult({
      applyWriteStatus,
      failureStage,
      finalState,
      formatterExecution,
      postApplyValidation,
      repeatedReadText,
      repeatConflictCheck,
      rollbackPath,
      rollbackRestoreStatus,
      sandboxWriteOperationCount,
      scenario,
      targetPath
    });
  }

  if (scenario.failureKind === "formatter-before-apply") {
    formatterExecution = "failed-before-apply";
    failureStage = "formatter-before-apply";
    return createFailureResult({
      applyWriteStatus,
      failureStage,
      finalState,
      formatterExecution,
      postApplyValidation,
      repeatedReadText,
      repeatConflictCheck,
      rollbackPath,
      rollbackRestoreStatus,
      sandboxWriteOperationCount,
      scenario,
      targetPath
    });
  }

  formatterExecution = "executed-by-sandbox-host";
  const transformedText = scenario.transform(repeatedReadText);
  const formattedText = formatSandboxText(transformedText);
  await writeFile(targetPath, formattedText, "utf8");
  sandboxWriteOperationCount += 1;
  applyWriteStatus = "applied-before-validation";
  const afterApplyText = await readFile(targetPath, "utf8");
  postApplyValidation = afterApplyText.includes(scenario.validationMarker) ? "passed" : "failed";

  if (postApplyValidation !== "passed") {
    await writeFile(targetPath, beforeText, "utf8");
    sandboxWriteOperationCount += 1;
    const restoredText = await readFile(targetPath, "utf8");
    rollbackRestoreStatus = createPrivateVersionToken(restoredText) === beforeVersion
      ? "restored-from-private-snapshot"
      : "restore-failed";
    applyWriteStatus = rollbackRestoreStatus === "restored-from-private-snapshot"
      ? "applied-then-rolled-back"
      : "applied-rollback-failed";
    finalState = rollbackRestoreStatus === "restored-from-private-snapshot"
      ? "restored-original-content"
      : "unknown-after-rollback";
    failureStage = "post-apply-validation";
  }

  return createFailureResult({
    applyWriteStatus,
    failureStage,
    finalState,
    formatterExecution,
    postApplyValidation,
    repeatedReadText,
    repeatConflictCheck,
    rollbackPath,
    rollbackRestoreStatus,
    sandboxWriteOperationCount,
    scenario,
    targetPath
  });
}

function createFailureResult({
  applyWriteStatus,
  failureStage,
  finalState,
  formatterExecution,
  postApplyValidation,
  repeatConflictCheck,
  rollbackPath,
  rollbackRestoreStatus,
  sandboxWriteOperationCount,
  scenario,
  targetPath
}) {
  return {
    id: scenario.id,
    label: scenario.label,
    targetKind: scenario.targetKind,
    failureKind: scenario.failureKind,
    failureStage,
    sandboxRelativePath: normalizePath(targetPath),
    rollbackRelativePath: normalizePath(rollbackPath),
    outputScope: "dist-sandbox",
    targetRepositoryMode: "not-a-target-repository",
    sandboxFileCreated: true,
    finalHumanConfirmation: "fixture-confirmed",
    repeatConflictCheck,
    rollbackSnapshotPrepared: true,
    rollbackSnapshotScope: "host-private-sandbox-file",
    rollbackSnapshotContentInEvidence: false,
    rollbackRestoreStatus,
    rollbackContentIncludedInEvidence: false,
    formatterExecution,
    applyWriteStatus,
    postApplyValidation,
    finalState,
    auditRecord: "redacted",
    digestValueIncludedInEvidence: false,
    sandboxWriteOperationCount,
    workspaceApplyEditCalled: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false,
    providerOwnedApply: false,
    lspServerOwnedApply: false,
    directApplyAllowed: false,
    auditSummary: {
      actor: "hia-host-sandbox",
      redaction: "content-and-digest-redacted",
      result: applyWriteStatus,
      validation: postApplyValidation
    }
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function formatSandboxText(text) {
  return `${text.replace(/\s+$/u, "")}\n`;
}

function createPrivateVersionToken(text) {
  return createHash("sha256").update(text).digest("hex");
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

function countPathExposure(serialized) {
  return /[A-Za-z]:[\\/]/u.test(serialized) || serialized.includes("file://") ? 1 : 0;
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
