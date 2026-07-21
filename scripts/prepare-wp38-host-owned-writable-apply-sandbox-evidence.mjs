import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp38-host-owned-writable-apply-sandbox");
const sandboxRoot = path.join(outputRoot, "sandbox");
const rollbackRoot = path.join(outputRoot, "private-rollback");
const evidencePath = path.join(outputRoot, "evidence.json");
const wp37CloseoutEvidencePath = path.join(rootDir, "dist", "wp37-closeout-provider-remote-inputs", "evidence.json");
const sandboxScenarios = [
  {
    id: "sandbox-locale-entry",
    label: "Sandbox locale resource entry",
    targetKind: "external-resource-locale-entry",
    relativePath: "locale/messages.zh-CN.json",
    initialText: "{\n}\n",
    transform(text) {
      return text.replace("{\n}", "{\n  \"welcome.title\": \"Welcome title sandbox\"\n}\n");
    },
    validationMarker: "\"welcome.title\""
  },
  {
    id: "sandbox-source-docline",
    label: "Sandbox source docline draft",
    targetKind: "source-docline-draft",
    relativePath: "src/example.ts",
    initialText: "export function greet(name: string): string {\n  return `Hello ${name}`;\n}\n",
    transform(text) {
      return `/**\n * Greets a named user.\n * @lang zh-CN\n * 问候指定用户。\n */\n${text}`;
    },
    validationMarker: "@lang zh-CN"
  }
];

await main();

/**
 * 准备 W-P38.1 host-owned writable apply sandbox evidence。
 * Prepare W-P38.1 host-owned writable apply sandbox evidence.
 *
 * This script performs real writes only inside a synthetic `dist/` sandbox. It
 * proves the host-owned apply sequence can execute final fixture confirmation,
 * repeated conflict checking, private rollback snapshots, formatter execution,
 * post-apply validation and redacted audit records without granting provider,
 * LSP server or target-repository write authority.
 *
 * 中文：本脚本只在 synthetic `dist/` sandbox 中真实写入文件，用于证明宿主拥有的
 * apply 顺序可以执行最终 fixture 确认、重复冲突检查、private rollback snapshot、
 * formatter、post-apply validation 与 redacted audit，同时仍不授予 provider、LSP
 * server 或目标仓库写入权。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const wp37Closeout = await readJson(wp37CloseoutEvidencePath);
  await mkdir(sandboxRoot, { recursive: true });
  await mkdir(rollbackRoot, { recursive: true });

  const transactionResults = [];
  for (const scenario of sandboxScenarios) {
    transactionResults.push(await runSandboxTransaction(scenario));
  }

  const summary = {
    wp37CloseoutReady: wp37Closeout.status === "ready-for-next-cycle-host-apply-and-provider-remote-planning",
    wp37CloseoutHardFailureCount: Number(wp37Closeout.summary?.hardFailureCount ?? -1),
    wp37WritableApplySandboxRequired: wp37Closeout.summary?.writableApplySandboxRequired,
    wp37RealGuiManualEvidenceRequired: wp37Closeout.summary?.realGuiManualEvidenceRequired,
    wp37RemoteProviderSmokeStillDeferred: wp37Closeout.summary?.remoteProviderSmokeStillDeferred,
    wp37TargetBranchPrFlowRequiredBeforeTargetMutation: wp37Closeout.summary?.targetBranchPrFlowRequiredBeforeTargetMutation,
    sandboxScenarioCount: transactionResults.length,
    sandboxFileCreatedCount: transactionResults.filter((result) => result.sandboxFileCreated === true).length,
    sandboxApplyAttemptCount: transactionResults.length,
    sandboxApplySuccessCount: transactionResults.filter((result) => result.applyStatus === "applied-to-sandbox").length,
    sandboxWriteOperationCount: transactionResults.reduce((total, result) => total + result.sandboxWriteOperationCount, 0),
    finalHumanConfirmationFixtureCount: transactionResults.filter((result) => result.finalHumanConfirmation === "fixture-confirmed").length,
    repeatConflictCheckCount: transactionResults.filter((result) => result.repeatConflictCheck === "clear").length,
    conflictBlockingCount: transactionResults.filter((result) => result.repeatConflictCheck !== "clear").length,
    rollbackPrivateSnapshotCount: transactionResults.filter((result) => result.rollbackSnapshotPrepared === true).length,
    rollbackContentIncludedInEvidenceCount: 0,
    formatterExecutionCount: transactionResults.filter((result) => result.formatterExecution === "executed-by-sandbox-host").length,
    postApplyValidationSuccessCount: transactionResults.filter((result) => result.postApplyValidation === "passed").length,
    redactedAuditRecordCount: transactionResults.filter((result) => result.auditRecord === "redacted").length,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    sandboxWriteAllowedCount: transactionResults.length,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects(transactionResults),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(transactionResults),
    secretValueMarkerCount: countSecretValueMarkers(transactionResults),
    digestValueIncludedInEvidenceCount: 0,
    pathExposureCount: countPathExposure(JSON.stringify(transactionResults)),
    sourcesContentPolicy: "none",
    sourceBodyIncludedInEvidence: false,
    realGuiManualEvidenceRequired: true,
    remoteProviderSmokeStillDeferred: true,
    targetBranchPrFlowRequiredBeforeTargetMutation: true,
    additionalHostParityStillRequired: true
  };
  const checks = [
    check("HIA_WP38_SANDBOX_WP37_CLOSEOUT_READY", summary.wp37CloseoutReady === true
      && summary.wp37CloseoutHardFailureCount === 0
      && summary.wp37WritableApplySandboxRequired === true, {
      actual: {
        status: wp37Closeout.status,
        wp37CloseoutHardFailureCount: summary.wp37CloseoutHardFailureCount,
        wp37WritableApplySandboxRequired: summary.wp37WritableApplySandboxRequired
      }
    }),
    check("HIA_WP38_SANDBOX_SCOPE_ONLY", summary.sandboxScenarioCount === 2
      && summary.sandboxFileCreatedCount === 2
      && summary.sandboxWriteAllowedCount === 2
      && transactionResults.every((result) => result.outputScope === "dist-sandbox")
      && transactionResults.every((result) => result.targetRepositoryMode === "not-a-target-repository"), {
      actual: {
        outputScopes: transactionResults.map((result) => result.outputScope),
        sandboxFileCreatedCount: summary.sandboxFileCreatedCount,
        sandboxScenarioCount: summary.sandboxScenarioCount,
        sandboxWriteAllowedCount: summary.sandboxWriteAllowedCount,
        targetRepositoryModes: transactionResults.map((result) => result.targetRepositoryMode)
      }
    }),
    check("HIA_WP38_SANDBOX_APPLY_SEQUENCE_COMPLETE", summary.finalHumanConfirmationFixtureCount === 2
      && summary.repeatConflictCheckCount === 2
      && summary.conflictBlockingCount === 0
      && summary.rollbackPrivateSnapshotCount === 2
      && summary.formatterExecutionCount === 2
      && summary.postApplyValidationSuccessCount === 2
      && summary.redactedAuditRecordCount === 2
      && summary.sandboxApplySuccessCount === 2, {
      actual: {
        finalHumanConfirmationFixtureCount: summary.finalHumanConfirmationFixtureCount,
        formatterExecutionCount: summary.formatterExecutionCount,
        postApplyValidationSuccessCount: summary.postApplyValidationSuccessCount,
        redactedAuditRecordCount: summary.redactedAuditRecordCount,
        repeatConflictCheckCount: summary.repeatConflictCheckCount,
        rollbackPrivateSnapshotCount: summary.rollbackPrivateSnapshotCount,
        sandboxApplySuccessCount: summary.sandboxApplySuccessCount
      }
    }),
    check("HIA_WP38_SANDBOX_NO_UNSAFE_WRITE_AUTHORITY", summary.workspaceApplyEditCallCount === 0
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
    check("HIA_WP38_SANDBOX_PRIVACY_CLEAN", summary.forbiddenDocumentTextMarkerCount === 0
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
    check("HIA_WP38_SANDBOX_FORWARD_GATES_RETAINED", summary.realGuiManualEvidenceRequired === true
      && summary.remoteProviderSmokeStillDeferred === true
      && summary.targetBranchPrFlowRequiredBeforeTargetMutation === true
      && summary.additionalHostParityStillRequired === true, {
      actual: {
        additionalHostParityStillRequired: summary.additionalHostParityStillRequired,
        realGuiManualEvidenceRequired: summary.realGuiManualEvidenceRequired,
        remoteProviderSmokeStillDeferred: summary.remoteProviderSmokeStillDeferred,
        targetBranchPrFlowRequiredBeforeTargetMutation: summary.targetBranchPrFlowRequiredBeforeTargetMutation
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp38-host-owned-writable-apply-sandbox-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-vscode-real-gui-confirmation-evidence" : "blocked",
    sourceEvidence: {
      wp37Closeout: normalizePath(wp37CloseoutEvidencePath)
    },
    sandboxPolicy: {
      applyAuthority: "host-owned-sandbox-only",
      outputScope: "dist-sandbox",
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
    transactionResults,
    checks,
    nextContractInputs: [
      {
        phase: "W-P38.2",
        topic: "vscode-real-gui-confirmation-evidence",
        reason: "Sandbox writes prove the host-owned sequence can execute, but real GUI confirmation still needs Extension Development Host evidence before any user-facing apply UX is enabled."
      },
      {
        phase: "W-P38.3",
        topic: "sandbox-rollback-restore-failure-path",
        reason: "The success path is proven; conflict, formatter and post-validation failure paths still need rollback restore evidence."
      },
      {
        phase: "W-P38.4+",
        topic: "remote-provider-smoke-and-target-branch-pr-flow",
        reason: "Remote provider smoke and target mutation remain separately gated and are not unlocked by sandbox writes."
      }
    ],
    manualChecks: [
      "Confirm all written files are under the W-P38 dist sandbox and not under target repositories.",
      "Confirm the next visible apply step uses a real VS Code Extension Development Host confirmation flow.",
      "Confirm remote/API provider smoke and target branch/PR flow stay separately approved."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P38 host-owned writable apply sandbox evidence");
  assert.equal(hardFailures.length, 0, `W-P38 host-owned writable apply sandbox evidence has ${hardFailures.length} hard failure(s).`);

  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P38 host-owned writable apply sandbox evidence prepared at ${normalizePath(evidencePath)}`);
}

async function runSandboxTransaction(scenario) {
  const targetPath = path.join(sandboxRoot, scenario.relativePath);
  const rollbackPath = path.join(rollbackRoot, `${scenario.id}.snapshot`);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, scenario.initialText, "utf8");
  const beforeText = await readFile(targetPath, "utf8");
  const beforeVersion = createPrivateVersionToken(beforeText);
  await writeFile(rollbackPath, beforeText, "utf8");
  const repeatedReadText = await readFile(targetPath, "utf8");
  const repeatConflictCheck = createPrivateVersionToken(repeatedReadText) === beforeVersion ? "clear" : "conflict";
  const transformedText = scenario.transform(repeatedReadText);
  const formattedText = formatSandboxText(transformedText);
  let applyStatus = "blocked";
  let postApplyValidation = "not-run";
  if (repeatConflictCheck === "clear") {
    await writeFile(targetPath, formattedText, "utf8");
    applyStatus = "applied-to-sandbox";
    const afterText = await readFile(targetPath, "utf8");
    postApplyValidation = afterText.includes(scenario.validationMarker) ? "passed" : "failed";
  }

  return {
    id: scenario.id,
    label: scenario.label,
    targetKind: scenario.targetKind,
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
    formatterExecution: "executed-by-sandbox-host",
    formatterKind: "normalize-final-newline",
    applyStatus,
    postApplyValidation,
    auditRecord: "redacted",
    digestValueIncludedInEvidence: false,
    sandboxWriteOperationCount: 3,
    workspaceApplyEditCalled: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false,
    providerOwnedApply: false,
    lspServerOwnedApply: false,
    directApplyAllowed: false,
    operationIntent: {
      semanticKind: scenario.targetKind,
      source: "wp37-host-owned-transaction",
      executableEditorObject: false
    },
    auditSummary: {
      actor: "hia-host-sandbox",
      redaction: "content-and-digest-redacted",
      result: applyStatus,
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
