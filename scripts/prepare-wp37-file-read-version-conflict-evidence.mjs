import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp37-file-read-version-conflict");
const fixtureRoot = path.join(outputRoot, "host-fixture");
const evidencePath = path.join(outputRoot, "evidence.json");
const transactionEvidencePath = path.join(rootDir, "dist", "wp37-host-edit-transaction", "evidence.json");

await main();

/**
 * 准备 W-P37.3 file read / version / conflict result evidence。
 * Prepare W-P37.3 file read / version / conflict result evidence.
 *
 * The script models the first host-owned preflight after a transaction is
 * created: the host reads a controlled fixture file, computes a private version
 * digest, resolves a semantic range and records a conflict result. The public
 * evidence intentionally omits document text, digest values, absolute paths and
 * editor write objects.
 *
 * 中文：本脚本建模 transaction 创建后的第一层宿主预检：宿主读取受控 fixture、
 * 计算私有版本摘要、解析语义 range，并记录冲突结果。公开 evidence 刻意不包含
 * 文档正文、摘要值、绝对路径和编辑器写入对象。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const transactionEvidence = await readJson(transactionEvidencePath);
  const transactions = Array.isArray(transactionEvidence.transactions) ? transactionEvidence.transactions : [];
  const fixtureManifest = await prepareSyntheticHostFixture(transactions);
  const hostReadResults = await createHostReadResults(transactions, fixtureManifest);
  const fileSnapshots = hostReadResults.map((result) => result.publicSnapshot);
  const fileVersionResults = hostReadResults.map((result, index) => createFileVersionResult(result, index));
  const rangeResults = hostReadResults.map((result, index) => createRangeResult(result, index));
  const conflictResults = rangeResults.map((result, index) => createConflictResult(result, fileVersionResults[index], index));
  const transactionPreflightResults = transactions.map((transaction, index) => createTransactionPreflightResult(transaction, fileVersionResults[index], rangeResults[index], conflictResults[index]));
  const contractBoundary = createContractBoundary();
  const conflictTaxonomy = createConflictTaxonomy();
  const snapshotPolicy = createSnapshotPolicy();
  const summary = {
    transactionEvidenceReady: transactionEvidence.status === "ready-for-file-read-version-conflict-result",
    transactionHardFailureCount: Number(transactionEvidence.summary?.hardFailureCount ?? -1),
    transactionCount: transactions.length,
    targetBindingCount: transactions.flatMap((transaction) => transaction.targetBindings ?? []).length,
    fixtureFileCount: fixtureManifest.files.length,
    hostFileSnapshotCount: fileSnapshots.length,
    fileVersionResultCount: fileVersionResults.length,
    rangeResultCount: rangeResults.length,
    conflictResultCount: conflictResults.length,
    hostReadStatusReadCount: fileSnapshots.filter((snapshot) => snapshot.read.status === "read").length,
    hostOwnedReadCount: fileSnapshots.filter((snapshot) => snapshot.authority.owner === "host").length,
    providerOwnedReadCount: fileSnapshots.filter((snapshot) => snapshot.authority.providerOwned === true).length,
    lspServerOwnedReadCount: fileSnapshots.filter((snapshot) => snapshot.authority.lspServerOwned === true).length,
    privateDigestComputedCount: fileVersionResults.filter((result) => result.contentHash.hostPrivateDigestComputed === true).length,
    digestValueIncludedInEvidenceCount: fileVersionResults.filter((result) => result.contentHash.digestValueIncludedInEvidence === true).length,
    versionTokenEstablishedCount: fileVersionResults.filter((result) => result.versionTokenStatus === "established").length,
    rangeResolvedCount: rangeResults.filter((result) => result.status === "resolved-for-insert").length,
    conflictClearCount: conflictResults.filter((result) => result.status === "clear" && result.blocking === false).length,
    conflictBlockingCount: conflictResults.filter((result) => result.blocking === true).length,
    repeatBeforeApplyRequiredCount: conflictResults.filter((result) => result.repeatBeforeApplyRequired === true).length,
    transactionConflictCheckedCount: transactionPreflightResults.filter((result) => result.currentState === "conflict-checked").length,
    transactionReadyForNextGateCount: transactionPreflightResults.filter((result) => result.nextRequired.includes("rollback-record")).length,
    realTargetFileReadCount: fileSnapshots.filter((snapshot) => snapshot.fixtureKind !== "synthetic-host-fixture").length,
    documentContentIncludedInEvidenceCount: fileSnapshots.filter((snapshot) => snapshot.read.documentContentIncludedInEvidence === true).length,
    workspaceWriteAllowedCount: transactionPreflightResults.filter((result) => result.safety.workspaceWriteAllowed === true).length,
    targetRepositoryMutationAllowedCount: transactionPreflightResults.filter((result) => result.safety.targetRepositoryMutationAllowed === true).length,
    directEditObjectCount: countDirectEditObjects({
      conflictResults,
      fileSnapshots,
      fileVersionResults,
      rangeResults,
      transactionPreflightResults
    }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({
      conflictResults,
      fileSnapshots,
      fileVersionResults,
      rangeResults,
      transactionPreflightResults
    }),
    secretValueMarkerCount: countSecretValueMarkers({
      conflictResults,
      fileSnapshots,
      fileVersionResults,
      rangeResults,
      transactionPreflightResults
    })
  };
  const checks = [
    check("HIA_WP37_FILE_READ_INPUT_READY", summary.transactionEvidenceReady === true
      && summary.transactionHardFailureCount === 0
      && summary.transactionCount === 2
      && summary.targetBindingCount === 2, {
      actual: {
        targetBindingCount: summary.targetBindingCount,
        transactionCount: summary.transactionCount,
        transactionEvidenceStatus: transactionEvidence.status,
        transactionHardFailureCount: summary.transactionHardFailureCount
      }
    }),
    check("HIA_WP37_FILE_READ_HOST_SNAPSHOTS_COMPLETE", summary.hostFileSnapshotCount === summary.targetBindingCount
      && summary.hostReadStatusReadCount === summary.targetBindingCount
      && summary.hostOwnedReadCount === summary.targetBindingCount
      && summary.providerOwnedReadCount === 0
      && summary.lspServerOwnedReadCount === 0, {
      actual: {
        hostFileSnapshotCount: summary.hostFileSnapshotCount,
        hostOwnedReadCount: summary.hostOwnedReadCount,
        hostReadStatusReadCount: summary.hostReadStatusReadCount,
        lspServerOwnedReadCount: summary.lspServerOwnedReadCount,
        providerOwnedReadCount: summary.providerOwnedReadCount,
        targetBindingCount: summary.targetBindingCount
      }
    }),
    check("HIA_WP37_FILE_VERSION_PRIVATE_HASH_BOUNDARY", summary.fileVersionResultCount === summary.targetBindingCount
      && summary.privateDigestComputedCount === summary.targetBindingCount
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.versionTokenEstablishedCount === summary.targetBindingCount
      && snapshotPolicy.publicEvidenceMayIncludeDigestValue === false, {
      actual: {
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        fileVersionResultCount: summary.fileVersionResultCount,
        privateDigestComputedCount: summary.privateDigestComputedCount,
        publicEvidenceMayIncludeDigestValue: snapshotPolicy.publicEvidenceMayIncludeDigestValue,
        targetBindingCount: summary.targetBindingCount,
        versionTokenEstablishedCount: summary.versionTokenEstablishedCount
      }
    }),
    check("HIA_WP37_CONFLICT_RESULTS_CLEAR_AND_REPEATABLE", summary.rangeResultCount === summary.targetBindingCount
      && summary.conflictResultCount === summary.targetBindingCount
      && summary.rangeResolvedCount === summary.targetBindingCount
      && summary.conflictClearCount === summary.targetBindingCount
      && summary.conflictBlockingCount === 0
      && summary.repeatBeforeApplyRequiredCount === summary.targetBindingCount, {
      actual: {
        conflictBlockingCount: summary.conflictBlockingCount,
        conflictClearCount: summary.conflictClearCount,
        conflictResultCount: summary.conflictResultCount,
        rangeResolvedCount: summary.rangeResolvedCount,
        repeatBeforeApplyRequiredCount: summary.repeatBeforeApplyRequiredCount,
        targetBindingCount: summary.targetBindingCount
      }
    }),
    check("HIA_WP37_FILE_READ_NO_WRITE_AUTHORITY", summary.transactionConflictCheckedCount === summary.transactionCount
      && summary.transactionReadyForNextGateCount === summary.transactionCount
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationAllowedCount === 0
      && summary.directEditObjectCount === 0
      && contractBoundary.applyAuthorityStillBlocked === true, {
      actual: {
        applyAuthorityStillBlocked: contractBoundary.applyAuthorityStillBlocked,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationAllowedCount: summary.targetRepositoryMutationAllowedCount,
        transactionConflictCheckedCount: summary.transactionConflictCheckedCount,
        transactionReadyForNextGateCount: summary.transactionReadyForNextGateCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP37_FILE_READ_PRIVACY_CLEAN", summary.realTargetFileReadCount === 0
      && summary.documentContentIncludedInEvidenceCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.secretValueMarkerCount === 0, {
      actual: {
        documentContentIncludedInEvidenceCount: summary.documentContentIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        realTargetFileReadCount: summary.realTargetFileReadCount,
        secretValueMarkerCount: summary.secretValueMarkerCount
      }
    }),
    check("HIA_WP37_CONFLICT_TAXONOMY_READY", conflictTaxonomy.statuses.length >= 7
      && conflictTaxonomy.blockingStatuses.includes("base-version-stale")
      && conflictTaxonomy.blockingStatuses.includes("range-mismatch")
      && conflictTaxonomy.nonBlockingStatuses.includes("clear"), {
      actual: {
        blockingStatuses: conflictTaxonomy.blockingStatuses,
        nonBlockingStatuses: conflictTaxonomy.nonBlockingStatuses,
        statusCount: conflictTaxonomy.statuses.length
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp37-file-read-version-conflict-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-rollback-formatter-audit-boundary" : "blocked",
    sourceEvidence: {
      hostEditTransaction: normalizePath(transactionEvidencePath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    hostFileReadVersionConflictContract: {
      contract: "hia-host-file-read-version-conflict-result",
      contractVersion: "0.1.0-draft",
      contractBoundary,
      snapshotPolicy,
      conflictTaxonomy
    },
    fixtureManifest: {
      fixtureKind: "synthetic-host-fixture",
      fileCount: fixtureManifest.files.length,
      files: fixtureManifest.files.map(({ content: _content, ...file }) => file)
    },
    fileSnapshots,
    fileVersionResults,
    rangeResults,
    conflictResults,
    transactionPreflightResults,
    checks,
    nextContractInputs: [
      {
        phase: "W-P37.4",
        topic: "rollback-formatter-audit-boundary",
        reason: "File snapshots, version tokens and conflict results are now modeled; rollback, formatter and audit records remain required before host confirmation."
      },
      {
        phase: "W-P37.5",
        topic: "vscode-checked-apply-confirmation-slice",
        reason: "VS Code first slice should consume transaction plus file/version/conflict evidence after rollback and audit boundaries exist."
      },
      {
        phase: "W-P37.6",
        topic: "target-self-doc-checked-apply-dry-run",
        reason: "Target-facing dry-run must keep target repositories read-only and should reuse the redacted version/conflict result shape."
      }
    ],
    manualChecks: [
      "Confirm public evidence contains no document text or digest values.",
      "Confirm host file reads are represented as host-owned snapshots, not provider-owned reads.",
      "Confirm conflict results must be repeated immediately before any future final apply.",
      "Confirm target repositories remain untouched; this stage uses synthetic host fixture files only."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P37 file read/version/conflict evidence");
  assert.equal(hardFailures.length, 0, `W-P37 file read/version/conflict evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P37 file read/version/conflict evidence prepared at ${normalizePath(evidencePath)}`);
}

async function prepareSyntheticHostFixture(transactions) {
  const targetPaths = [...new Set(transactions.flatMap((transaction) => (transaction.targetBindings ?? [])
    .map((target) => target.path)
    .filter(isNonEmptyString)))];
  const files = targetPaths.map((relativePath) => createSyntheticFixtureFile(relativePath));

  for (const file of files) {
    const absolutePath = path.join(fixtureRoot, file.relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.content, "utf8");
  }

  return {
    files
  };
}

function createSyntheticFixtureFile(relativePath) {
  if (relativePath === "i18n/profile.hia-i18n.json") {
    return {
      relativePath,
      fixtureRole: "external-resource",
      content: `${JSON.stringify({
        en: {
          profile: {
            render: {
              title: "Profile"
            }
          }
        }
      }, null, 2)}\n`
    };
  }

  if (relativePath === "src/sample.toy") {
    return {
      relativePath,
      fixtureRole: "source-docline",
      content: [
        "function helper(value) {",
        "  return value;",
        "}",
        ""
      ].join("\n")
    };
  }

  throw new Error(`No synthetic W-P37 host fixture is defined for ${relativePath}.`);
}

async function createHostReadResults(transactions, fixtureManifest) {
  const results = [];

  for (const [transactionIndex, transaction] of transactions.entries()) {
    for (const [targetIndex, targetBinding] of (transaction.targetBindings ?? []).entries()) {
      const fixtureFile = fixtureManifest.files.find((file) => file.relativePath === targetBinding.path);
      assert(fixtureFile, `Missing synthetic fixture for ${targetBinding.path}.`);
      const fixturePath = path.join(fixtureRoot, fixtureFile.relativePath);
      const text = await readFile(fixturePath, "utf8");
      const digest = createHash("sha256").update(text, "utf8").digest("hex");
      const lines = splitLines(text);
      results.push({
        transaction,
        transactionIndex,
        targetBinding,
        targetIndex,
        text,
        privateDigest: digest,
        publicSnapshot: {
          contract: "hia-host-file-snapshot",
          contractVersion: "0.1.0-draft",
          id: `host-file-snapshot-${String(results.length + 1).padStart(2, "0")}`,
          transactionId: transaction.id,
          targetBindingId: targetBinding.id,
          targetKind: transaction.targetKind,
          path: targetBinding.path,
          pointer: targetBinding.pointer ?? null,
          symbolId: targetBinding.symbolId ?? null,
          fixtureKind: "synthetic-host-fixture",
          authority: {
            owner: "host",
            providerOwned: false,
            lspServerOwned: false,
            rendererOwned: false
          },
          read: {
            status: "read",
            source: "host-file-read",
            encoding: "utf8",
            byteLength: Buffer.byteLength(text, "utf8"),
            lineCount: lines.length,
            lineEnding: detectLineEnding(text),
            documentContentIncludedInEvidence: false
          }
        }
      });
    }
  }

  return results;
}

function createFileVersionResult(hostReadResult, index) {
  const snapshot = hostReadResult.publicSnapshot;
  assert.equal(hostReadResult.privateDigest.length, 64, "sha256 digest must be computed before redaction.");
  return {
    contract: "hia-host-file-version-result",
    contractVersion: "0.1.0-draft",
    id: `file-version-result-${String(index + 1).padStart(2, "0")}`,
    transactionId: snapshot.transactionId,
    snapshotId: snapshot.id,
    targetBindingId: snapshot.targetBindingId,
    path: snapshot.path,
    status: "version-established",
    versionToken: `host-version-token-${String(index + 1).padStart(2, "0")}`,
    versionTokenStatus: "established",
    versionSource: "host-file-read",
    contentHash: {
      algorithm: "sha256",
      status: "computed-host-private",
      hostPrivateDigestComputed: true,
      digestValueIncludedInEvidence: false,
      digestEvidenceRef: `host-private-digest-ref-${String(index + 1).padStart(2, "0")}`
    },
    documentShape: {
      byteLength: snapshot.read.byteLength,
      lineCount: snapshot.read.lineCount,
      lineEnding: snapshot.read.lineEnding,
      encoding: snapshot.read.encoding
    }
  };
}

function createRangeResult(hostReadResult, index) {
  const snapshot = hostReadResult.publicSnapshot;

  if (hostReadResult.transaction.targetKind === "external-resource-locale-entry") {
    const json = JSON.parse(hostReadResult.text);
    const pointer = String(hostReadResult.targetBinding.pointer ?? "");
    const parentPointer = pointer.slice(0, pointer.lastIndexOf("/"));
    const parentExists = jsonPointerExists(json, parentPointer);
    const targetExists = jsonPointerExists(json, pointer);
    return {
      contract: "hia-host-range-result",
      contractVersion: "0.1.0-draft",
      id: `range-result-${String(index + 1).padStart(2, "0")}`,
      transactionId: snapshot.transactionId,
      snapshotId: snapshot.id,
      targetBindingId: snapshot.targetBindingId,
      path: snapshot.path,
      targetKind: hostReadResult.transaction.targetKind,
      rangeKind: "json-pointer-insertion",
      pointer,
      status: parentExists && !targetExists ? "resolved-for-insert" : "blocked",
      parentExists,
      targetExists,
      documentContentIncludedInEvidence: false
    };
  }

  if (hostReadResult.transaction.targetKind === "source-docline-draft") {
    const lines = splitLines(hostReadResult.text);
    const anchorLine = lines.findIndex((line) => /\bfunction\s+helper\b/u.test(line));
    const existingDocline = anchorLine > 0 && isDoclineMarker(lines[anchorLine - 1]);
    return {
      contract: "hia-host-range-result",
      contractVersion: "0.1.0-draft",
      id: `range-result-${String(index + 1).padStart(2, "0")}`,
      transactionId: snapshot.transactionId,
      snapshotId: snapshot.id,
      targetBindingId: snapshot.targetBindingId,
      path: snapshot.path,
      targetKind: hostReadResult.transaction.targetKind,
      rangeKind: "symbol-anchor-insertion",
      symbolId: hostReadResult.targetBinding.symbolId ?? null,
      status: anchorLine >= 0 && !existingDocline ? "resolved-for-insert" : "blocked",
      anchorFound: anchorLine >= 0,
      existingDoclineFound: existingDocline,
      range: anchorLine >= 0 ? {
        start: {
          line: anchorLine,
          character: 0
        },
        end: {
          line: anchorLine,
          character: 0
        }
      } : null,
      documentContentIncludedInEvidence: false
    };
  }

  return {
    contract: "hia-host-range-result",
    contractVersion: "0.1.0-draft",
    id: `range-result-${String(index + 1).padStart(2, "0")}`,
    transactionId: snapshot.transactionId,
    snapshotId: snapshot.id,
    targetBindingId: snapshot.targetBindingId,
    path: snapshot.path,
    targetKind: hostReadResult.transaction.targetKind,
    rangeKind: "unknown",
    status: "blocked",
    reason: "unsupported-target-kind",
    documentContentIncludedInEvidence: false
  };
}

function createConflictResult(rangeResult, fileVersionResult, index) {
  const clear = rangeResult.status === "resolved-for-insert";
  return {
    contract: "hia-host-conflict-result",
    contractVersion: "0.1.0-draft",
    id: `conflict-result-${String(index + 1).padStart(2, "0")}`,
    transactionId: rangeResult.transactionId,
    snapshotId: rangeResult.snapshotId,
    fileVersionResultId: fileVersionResult.id,
    rangeResultId: rangeResult.id,
    path: rangeResult.path,
    targetKind: rangeResult.targetKind,
    status: clear ? "clear" : conflictStatusForRange(rangeResult),
    blocking: !clear,
    conflictKinds: clear ? [] : [conflictStatusForRange(rangeResult)],
    checkedBy: "host",
    checkedAgainstVersionToken: fileVersionResult.versionToken,
    repeatBeforeApplyRequired: true,
    documentContentIncludedInEvidence: false
  };
}

function createTransactionPreflightResult(transaction, fileVersionResult, rangeResult, conflictResult) {
  return {
    contract: "hia-host-edit-transaction-preflight-result",
    contractVersion: "0.1.0-draft",
    transactionId: transaction.id,
    reviewItemId: transaction.reviewItemId,
    previousState: transaction.status,
    currentState: conflictResult.status === "clear" ? "conflict-checked" : "pending-host-preflight",
    targetKind: transaction.targetKind,
    fileVersionResultId: fileVersionResult.id,
    rangeResultId: rangeResult.id,
    conflictResultId: conflictResult.id,
    nextRequired: conflictResult.status === "clear"
      ? [
        "rollback-record",
        "formatter-validation",
        "apply-audit-record",
        "final-human-confirmation"
      ]
      : [
        "human-review-conflict-resolution"
      ],
    safety: {
      applyAuthorityStillBlocked: true,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      directApplyAllowed: false,
      documentContentIncludedInEvidence: false
    }
  };
}

function createContractBoundary() {
  return {
    hostOwnedReadRequired: true,
    hostOwnedConflictCheckRequired: true,
    providerOwnedReadAllowed: false,
    lspServerOwnedReadAllowed: false,
    publicEvidenceMayContainDocumentContent: false,
    publicEvidenceMayContainDigestValue: false,
    applyAuthorityStillBlocked: true,
    repeatConflictCheckImmediatelyBeforeApply: true
  };
}

function createSnapshotPolicy() {
  return {
    contract: "hia-host-file-snapshot-policy",
    contractVersion: "0.1.0-draft",
    allowedFixtureKind: "synthetic-host-fixture",
    realTargetFileReadInEvidenceAllowed: false,
    publicEvidenceMayIncludeDocumentContent: false,
    publicEvidenceMayIncludeDigestValue: false,
    publicEvidenceMayIncludeRelativePath: true,
    hostPrivateAuditMayRetainDigest: true,
    hashAlgorithm: "sha256",
    defaultTextEncoding: "utf8"
  };
}

function createConflictTaxonomy() {
  const statuses = [
    "clear",
    "target-missing",
    "base-version-stale",
    "range-mismatch",
    "semantic-anchor-missing",
    "resource-pointer-conflict",
    "formatter-unavailable",
    "host-permission-denied"
  ];
  return {
    contract: "hia-host-conflict-taxonomy",
    contractVersion: "0.1.0-draft",
    statuses,
    nonBlockingStatuses: ["clear"],
    blockingStatuses: statuses.filter((status) => status !== "clear")
  };
}

function conflictStatusForRange(rangeResult) {
  if (rangeResult.rangeKind === "json-pointer-insertion") {
    return rangeResult.targetExists ? "resource-pointer-conflict" : "target-missing";
  }

  if (rangeResult.rangeKind === "symbol-anchor-insertion") {
    return rangeResult.anchorFound ? "range-mismatch" : "semantic-anchor-missing";
  }

  return "range-mismatch";
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function splitLines(text) {
  const normalized = text.endsWith("\n") ? text.slice(0, -1) : text;
  return normalized.length > 0 ? normalized.split(/\r?\n/u) : [];
}

function detectLineEnding(text) {
  return text.includes("\r\n") ? "crlf" : "lf";
}

function isDoclineMarker(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("/**") || trimmed.startsWith("///") || trimmed.startsWith("#/");
}

function jsonPointerExists(value, pointer) {
  if (pointer === "") {
    return true;
  }

  const segments = pointer.split("/").slice(1).map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  let current = value;

  for (const segment of segments) {
    if (!isRecord(current) || !Object.hasOwn(current, segment)) {
      return false;
    }
    current = current[segment];
  }

  return true;
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

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
