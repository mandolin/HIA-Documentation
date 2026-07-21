import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp37-host-edit-transaction");
const evidencePath = path.join(outputRoot, "evidence.json");
const baselinePath = path.join(rootDir, "dist", "wp37-checked-apply-baseline-audit", "evidence.json");
const aiAuthoringPath = path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json");

await main();

/**
 * 准备 W-P37.2 host edit transaction contract evidence。
 * Prepare W-P37.2 host edit transaction contract evidence.
 *
 * The evidence maps review-payload edit candidates into host-owned transaction
 * candidates. These transaction candidates bind semantic diff operations,
 * required preflight checks and provenance, but remain non-executable until a
 * later host confirms file versions, conflicts, rollback and user approval.
 *
 * 本 evidence 将 review payload 中的 edit candidate 映射为宿主拥有的
 * transaction candidate。这些候选绑定 semantic diff operation、必需的
 * preflight check 与 provenance，但在后续宿主确认文件版本、冲突、回滚和用户
 * 审批前仍不可执行。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const baseline = await readJson(baselinePath);
  const aiAuthoring = await readJson(aiAuthoringPath);
  const reviewPayload = aiAuthoring.result?.reviewPayload;
  const reviewItems = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
  const transactions = createHostEditTransactions(reviewPayload, reviewItems);
  const stateMachine = createTransactionStateMachine();
  const authorityBoundary = createAuthorityBoundary();
  const transactionOperations = transactions.flatMap((transaction) => transaction.transactionOperations);
  const targetBindings = transactions.flatMap((transaction) => transaction.targetBindings);
  const summary = {
    baselineReady: baseline.status === "ready-for-host-edit-transaction-contract",
    baselineHardFailureCount: Number(baseline.summary?.hardFailureCount ?? -1),
    reviewItemCount: reviewItems.length,
    editCandidateCount: reviewItems.filter((item) => isRecord(item.editCandidate)).length,
    previewableEditCandidateCount: reviewItems.filter((item) => item.editCandidate?.status === "preview-only").length,
    hostCheckCandidateCount: reviewItems.filter((item) => item.editCandidate?.applyPreflight?.status === "requires-host-check").length,
    transactionCount: transactions.length,
    transactionOperationCount: transactionOperations.length,
    targetBindingCount: targetBindings.length,
    externalResourceTransactionCount: transactions.filter((transaction) => transaction.targetKind === "external-resource-locale-entry").length,
    sourceDoclineTransactionCount: transactions.filter((transaction) => transaction.targetKind === "source-docline-draft").length,
    transactionStateCount: stateMachine.states.length,
    blockingStateCount: stateMachine.states.filter((state) => state.writeAuthority === "blocked").length,
    terminalApplyStateCount: stateMachine.states.filter((state) => state.id === "applied-by-host").length,
    humanApprovalRequiredCount: transactions.filter((transaction) => transaction.preconditions.humanApprovalRecord === "required").length,
    hostFileReadRequiredCount: transactions.filter((transaction) => transaction.preconditions.hostFileRead === "required").length,
    conflictCheckRequiredCount: transactions.filter((transaction) => transaction.preconditions.conflictResult === "required").length,
    rollbackRecordRequiredCount: transactions.filter((transaction) => transaction.preconditions.rollbackRecord === "required").length,
    formatterValidationRequiredCount: transactions.filter((transaction) => transaction.preconditions.formatterValidation === "required").length,
    auditRecordRequiredCount: transactions.filter((transaction) => transaction.preconditions.applyAuditRecord === "required").length,
    providerProvenanceRetainedCount: transactions.filter((transaction) => transaction.providerProvenanceRetained === true).length,
    hostOwnedTransactionCount: transactions.filter((transaction) => transaction.authority.owner === "host").length,
    providerOwnedTransactionCount: transactions.filter((transaction) => transaction.authority.providerOwned === true).length,
    lspServerOwnedTransactionCount: transactions.filter((transaction) => transaction.authority.lspServerOwned === true).length,
    executableTransactionCount: transactions.filter((transaction) => transaction.safety.executable === true).length,
    directApplyAllowedCount: transactions.filter((transaction) => transaction.safety.directApplyAllowed === true).length,
    workspaceWriteAllowedCount: transactions.filter((transaction) => transaction.safety.workspaceWriteAllowed === true).length,
    targetRepositoryMutationAllowedCount: transactions.filter((transaction) => transaction.safety.targetRepositoryMutationAllowed === true).length,
    sourceBodyMarkerCount: countForbiddenSourceMarkers(transactions),
    secretValueMarkerCount: countSecretValueMarkers(transactions),
    directEditObjectCount: countDirectEditObjects(transactions)
  };
  const checks = [
    check("HIA_WP37_TRANSACTION_BASELINE_READY", summary.baselineReady === true
      && summary.baselineHardFailureCount === 0, {
      actual: {
        baselineHardFailureCount: summary.baselineHardFailureCount,
        baselineStatus: baseline.status
      }
    }),
    check("HIA_WP37_TRANSACTION_CANDIDATES_MAPPED", summary.transactionCount === 2
      && summary.transactionOperationCount === 2
      && summary.targetBindingCount === 2
      && summary.externalResourceTransactionCount === 1
      && summary.sourceDoclineTransactionCount === 1, {
      actual: {
        externalResourceTransactionCount: summary.externalResourceTransactionCount,
        sourceDoclineTransactionCount: summary.sourceDoclineTransactionCount,
        targetBindingCount: summary.targetBindingCount,
        transactionCount: summary.transactionCount,
        transactionOperationCount: summary.transactionOperationCount
      }
    }),
    check("HIA_WP37_TRANSACTION_PRECONDITIONS_REQUIRED", summary.humanApprovalRequiredCount === summary.transactionCount
      && summary.hostFileReadRequiredCount === summary.transactionCount
      && summary.conflictCheckRequiredCount === summary.transactionCount
      && summary.rollbackRecordRequiredCount === summary.transactionCount
      && summary.formatterValidationRequiredCount === summary.transactionCount
      && summary.auditRecordRequiredCount === summary.transactionCount, {
      actual: {
        auditRecordRequiredCount: summary.auditRecordRequiredCount,
        conflictCheckRequiredCount: summary.conflictCheckRequiredCount,
        formatterValidationRequiredCount: summary.formatterValidationRequiredCount,
        hostFileReadRequiredCount: summary.hostFileReadRequiredCount,
        humanApprovalRequiredCount: summary.humanApprovalRequiredCount,
        rollbackRecordRequiredCount: summary.rollbackRecordRequiredCount,
        transactionCount: summary.transactionCount
      }
    }),
    check("HIA_WP37_TRANSACTION_HOST_OWNED_ONLY", summary.hostOwnedTransactionCount === summary.transactionCount
      && summary.providerOwnedTransactionCount === 0
      && summary.lspServerOwnedTransactionCount === 0
      && authorityBoundary.hostOwnedApplyRequired === true
      && authorityBoundary.providerOwnedApplyAllowed === false
      && authorityBoundary.lspServerOwnedApplyAllowed === false, {
      actual: {
        authorityBoundary,
        hostOwnedTransactionCount: summary.hostOwnedTransactionCount,
        lspServerOwnedTransactionCount: summary.lspServerOwnedTransactionCount,
        providerOwnedTransactionCount: summary.providerOwnedTransactionCount,
        transactionCount: summary.transactionCount
      }
    }),
    check("HIA_WP37_TRANSACTION_NON_EXECUTABLE", summary.executableTransactionCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        executableTransactionCount: summary.executableTransactionCount,
        targetRepositoryMutationAllowedCount: summary.targetRepositoryMutationAllowedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP37_TRANSACTION_PRIVACY_CLEAN", summary.sourceBodyMarkerCount === 0
      && summary.secretValueMarkerCount === 0, {
      actual: {
        secretValueMarkerCount: summary.secretValueMarkerCount,
        sourceBodyMarkerCount: summary.sourceBodyMarkerCount
      }
    }),
    check("HIA_WP37_TRANSACTION_STATE_MACHINE_BOUNDARY", summary.transactionStateCount >= 7
      && summary.blockingStateCount >= 6
      && summary.terminalApplyStateCount === 1
      && stateMachine.transitions.every((transition) => transition.authority === "host"), {
      actual: {
        blockingStateCount: summary.blockingStateCount,
        terminalApplyStateCount: summary.terminalApplyStateCount,
        transactionStateCount: summary.transactionStateCount,
        transitionAuthorities: stateMachine.transitions.map((transition) => transition.authority)
      }
    }),
    check("HIA_WP37_TRANSACTION_PROVIDER_PROVENANCE_RETAINED", summary.providerProvenanceRetainedCount === summary.transactionCount, {
      actual: {
        providerProvenanceRetainedCount: summary.providerProvenanceRetainedCount,
        transactionCount: summary.transactionCount
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp37-host-edit-transaction-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-file-read-version-conflict-result" : "blocked",
    sourceEvidence: {
      aiAuthoring: normalizePath(aiAuthoringPath),
      checkedApplyBaseline: normalizePath(baselinePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    hostEditTransactionContract: {
      contract: "hia-host-edit-transaction",
      contractVersion: "0.1.0-draft",
      authorityBoundary,
      stateMachine,
      transactionCount: transactions.length
    },
    transactions,
    checks,
    nextContractInputs: [
      {
        phase: "W-P37.3",
        topic: "file-read-version-conflict-result",
        reason: "Host edit transactions now exist as non-executable envelopes; host file snapshots and conflict results are still required."
      },
      {
        phase: "W-P37.4",
        topic: "rollback-formatter-audit-boundary",
        reason: "Transactions declare rollback, formatter and audit preconditions; the concrete records are defined next."
      },
      {
        phase: "W-P37.5",
        topic: "vscode-checked-apply-confirmation-slice",
        reason: "VS Code can later consume host edit transactions after file/version/conflict and rollback evidence exists."
      }
    ],
    manualChecks: [
      "Confirm host edit transactions are treated as envelopes, not as runnable patches.",
      "Confirm every transaction keeps provider provenance attached to the review item.",
      "Confirm each host maps transaction operations through its own editor API after approval and preflight.",
      "Confirm target projects remain read-only until they explicitly run their own adoption workflow."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P37 host edit transaction evidence");
  assert.equal(hardFailures.length, 0, `W-P37 host edit transaction evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P37 host edit transaction evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createHostEditTransactions(reviewPayload, reviewItems) {
  return reviewItems
    .filter((item) => item.editCandidate?.status === "preview-only" && item.editCandidate?.applyPreflight?.status === "requires-host-check")
    .map((item, index) => createHostEditTransaction(reviewPayload, item, index));
}

function createHostEditTransaction(reviewPayload, item, index) {
  const candidate = item.editCandidate;
  const operations = Array.isArray(candidate.diffPreview?.operations) ? candidate.diffPreview.operations : [];
  const targetFiles = Array.isArray(candidate.applyPreflight?.targetFiles) ? candidate.applyPreflight.targetFiles : [];
  return {
    contract: "hia-host-edit-transaction",
    contractVersion: "0.1.0-draft",
    id: `host-edit-transaction-${String(index + 1).padStart(2, "0")}`,
    sourceReviewPayloadRef: {
      contract: reviewPayload?.contract ?? "unknown",
      contractVersion: reviewPayload?.contractVersion ?? "unknown",
      id: reviewPayload?.id ?? "unknown"
    },
    reviewItemId: item.id,
    proposalId: item.proposalId,
    draftId: item.draftId ?? null,
    targetKind: candidate.kind,
    status: "pending-host-preflight",
    authority: {
      owner: "host",
      providerOwned: false,
      lspServerOwned: false,
      rendererOwned: false,
      providerResultMayAuthorizeApply: false
    },
    preconditions: {
      humanApprovalRecord: "required",
      hostFileRead: "required",
      fileVersionResult: "required",
      conflictResult: "required",
      rollbackRecord: "required",
      formatterValidation: "required",
      workspaceTrustOrTargetConsent: "required",
      applyAuditRecord: "required"
    },
    safety: {
      executable: false,
      directApplyAllowed: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      toolExecutionAllowed: false,
      includesSourceContent: false,
      sourcesContentPolicy: "none"
    },
    providerProvenanceRetained: true,
    transactionOperations: operations.map((operation, operationIndex) => createTransactionOperation(operation, operationIndex)),
    targetBindings: targetFiles.map((targetFile, targetIndex) => createTargetBinding(targetFile, targetIndex)),
    state: {
      current: "pending-host-preflight",
      nextRequired: [
        "human-approval-record",
        "host-file-read",
        "file-version-result",
        "conflict-result",
        "rollback-record",
        "formatter-validation",
        "apply-audit-record"
      ]
    }
  };
}

function createTransactionOperation(operation, index) {
  return {
    id: `operation-${String(index + 1).padStart(2, "0")}`,
    semanticOperation: operation.op,
    targetKind: operation.op === "add-locale-entry" ? "external-resource" : "source-docline",
    path: operation.path,
    pointer: operation.pointer ?? null,
    symbolId: operation.symbolId ?? null,
    locale: operation.locale ?? null,
    valuePreviewRef: operation.valuePreview ? "review-preview-text" : null,
    executable: false,
    requiresHostMapping: true
  };
}

function createTargetBinding(targetFile, index) {
  return {
    id: `target-binding-${String(index + 1).padStart(2, "0")}`,
    role: targetFile.role,
    path: targetFile.path,
    pointer: targetFile.pointer ?? null,
    symbolId: targetFile.symbolId ?? null,
    fileVersionStatus: targetFile.fileVersion?.status ?? "not-read",
    conflictStatus: targetFile.conflict?.status ?? "not-checked",
    formatter: targetFile.formatting?.formatter ?? "host-required",
    rollbackStrategy: targetFile.rollback?.strategy ?? "host-undo",
    rollbackRecordRequired: targetFile.rollback?.recordRequired === true,
    hostFileReadRequired: true,
    conflictCheckRequired: true
  };
}

function createTransactionStateMachine() {
  return {
    contract: "hia-host-edit-transaction-state-machine",
    contractVersion: "0.1.0-draft",
    initialState: "proposed",
    states: [
      createState("proposed", "blocked"),
      createState("reviewed-by-human", "blocked"),
      createState("pending-host-preflight", "blocked"),
      createState("host-file-version-read", "blocked"),
      createState("conflict-checked", "blocked"),
      createState("ready-for-host-confirmation", "blocked"),
      createState("applied-by-host", "host-confirmed-only"),
      createState("rejected-or-cancelled", "blocked")
    ],
    transitions: [
      createTransition("proposed", "reviewed-by-human", "human-approval-record"),
      createTransition("reviewed-by-human", "pending-host-preflight", "host-takes-transaction-ownership"),
      createTransition("pending-host-preflight", "host-file-version-read", "host-file-read"),
      createTransition("host-file-version-read", "conflict-checked", "host-conflict-check"),
      createTransition("conflict-checked", "ready-for-host-confirmation", "rollback-formatter-audit-ready"),
      createTransition("ready-for-host-confirmation", "applied-by-host", "final-human-confirmation"),
      createTransition("proposed", "rejected-or-cancelled", "human-rejects")
    ]
  };
}

function createState(id, writeAuthority) {
  return {
    id,
    writeAuthority
  };
}

function createTransition(from, to, requirement) {
  return {
    from,
    to,
    requirement,
    authority: "host"
  };
}

function createAuthorityBoundary() {
  return {
    hostOwnedApplyRequired: true,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    rendererOwnedApplyAllowed: false,
    evidenceScriptApplyAllowed: false,
    transactionMayCarryDirectEditorObject: false,
    transactionMayCarrySemanticOperationOnly: true
  };
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

function countForbiddenSourceMarkers(value) {
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
