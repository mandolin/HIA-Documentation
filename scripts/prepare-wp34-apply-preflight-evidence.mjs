import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp34-apply-preflight-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPath = path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json");

await main();

/**
 * 准备 W-P34.3 apply preflight 元数据证据。
 * Prepare W-P34.3 evidence for apply preflight metadata.
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const aiAuthoring = JSON.parse(await readFile(inputPath, "utf8"));
  const reviewPayload = aiAuthoring.result?.reviewPayload;
  const reviewItems = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
  const editCandidates = reviewItems.map((item) => item.editCandidate).filter(isRecord);
  const applyPreflights = editCandidates.map((candidate) => candidate.applyPreflight).filter(isRecord);
  const targetFiles = applyPreflights.flatMap((preflight) => Array.isArray(preflight.targetFiles) ? preflight.targetFiles : []);
  const externalResourceTarget = targetFiles.find((targetFile) => targetFile.role === "external-resource");
  const sourceDoclineTarget = targetFiles.find((targetFile) => targetFile.role === "source-docline");
  const summary = {
    applyPreflightCount: applyPreflights.length,
    candidateCount: editCandidates.length,
    conflictNotCheckedCount: targetFiles.filter((targetFile) => targetFile.conflict?.status === "not-checked").length,
    directEditObjectCount: countDirectEditObjects(reviewPayload),
    fileVersionNotReadCount: targetFiles.filter((targetFile) => targetFile.fileVersion?.status === "not-read").length,
    hostCheckCount: applyPreflights.filter((preflight) => preflight.status === "requires-host-check").length,
    notApplicableCount: applyPreflights.filter((preflight) => preflight.status === "not-applicable").length,
    rollbackHostUndoCount: targetFiles.filter((targetFile) => targetFile.rollback?.strategy === "host-undo" && targetFile.rollback?.recordRequired === true).length,
    targetFileCount: targetFiles.length,
    unsafeApplyPreflightCount: applyPreflights.filter(hasUnsafeApplyPreflight).length
  };
  const checks = [
    check("HIA_WP34_APPLY_PREFLIGHT_CONTRACT_PRESENT", summary.applyPreflightCount === summary.candidateCount && summary.applyPreflightCount > 0, {
      actual: summary.applyPreflightCount,
      expected: summary.candidateCount
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_STATUS_SPLIT", summary.hostCheckCount === 2 && summary.notApplicableCount === 2, {
      actual: {
        hostCheckCount: summary.hostCheckCount,
        notApplicableCount: summary.notApplicableCount
      },
      expected: {
        hostCheckCount: 2,
        notApplicableCount: 2
      }
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_TARGET_FILES", summary.targetFileCount === 2 && isRecord(externalResourceTarget) && isRecord(sourceDoclineTarget), {
      actual: {
        externalResourceTarget: externalResourceTarget ?? null,
        sourceDoclineTarget: sourceDoclineTarget ?? null,
        targetFileCount: summary.targetFileCount
      },
      expected: {
        externalResource: true,
        sourceDocline: true,
        targetFileCount: 2
      }
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_FILE_VERSION_REQUIRED", summary.fileVersionNotReadCount === summary.targetFileCount && summary.targetFileCount > 0, {
      actual: summary.fileVersionNotReadCount,
      expected: summary.targetFileCount
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_CONFLICT_NOT_CHECKED", summary.conflictNotCheckedCount === summary.targetFileCount && summary.targetFileCount > 0, {
      actual: summary.conflictNotCheckedCount,
      expected: summary.targetFileCount
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_ROLLBACK_REQUIRED", summary.rollbackHostUndoCount === summary.targetFileCount && summary.targetFileCount > 0, {
      actual: summary.rollbackHostUndoCount,
      expected: summary.targetFileCount
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_EXTERNAL_RESOURCE_TARGET", isRecord(externalResourceTarget)
      && externalResourceTarget.path === "i18n/profile.hia-i18n.json"
      && externalResourceTarget.pointer === "/en/profile.render.description"
      && externalResourceTarget.formatting?.formatter === "json-resource-merge-required", {
      actual: externalResourceTarget ?? null,
      expected: {
        formatter: "json-resource-merge-required",
        path: "i18n/profile.hia-i18n.json",
        pointer: "/en/profile.render.description"
      }
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_SOURCE_DOCLINE_TARGET", isRecord(sourceDoclineTarget)
      && sourceDoclineTarget.path === "src/sample.toy"
      && sourceDoclineTarget.symbolId === "toy:helper"
      && sourceDoclineTarget.formatting?.formatter === "language-adapter-required", {
      actual: sourceDoclineTarget ?? null,
      expected: {
        formatter: "language-adapter-required",
        path: "src/sample.toy",
        symbolId: "toy:helper"
      }
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_SAFE_BOUNDARY", summary.unsafeApplyPreflightCount === 0, {
      actual: summary.unsafeApplyPreflightCount,
      expected: 0
    }),
    check("HIA_WP34_APPLY_PREFLIGHT_NO_DIRECT_EDIT_OBJECT", summary.directEditObjectCount === 0, {
      actual: summary.directEditObjectCount,
      expected: 0
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp34-apply-preflight-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-vscode-apply-preview-first-slice" : "blocked",
    sourceEvidence: {
      aiAuthoring: normalizePath(inputPath)
    },
    summary,
    applyPreflightStatuses: countBy(applyPreflights.map((preflight) => preflight.status ?? "unknown")),
    targetFileRoles: countBy(targetFiles.map((targetFile) => targetFile.role ?? "unknown")),
    checks,
    nextContractInputs: [
      {
        phase: "W-P34.4",
        topic: "vscode-apply-preview-first-slice",
        reason: "Host-visible apply preflight metadata now names required file reads, conflict checks and rollback records."
      },
      {
        phase: "W-P34.6",
        topic: "target-project-dry-run-evidence",
        reason: "Target projects can later run dry-run checks against host preflight metadata without accepting automatic writes."
      }
    ],
    manualChecks: [
      "Confirm VS Code displays file-version-not-read and conflict-status-not-checked before offering any apply preview.",
      "Confirm host implementations do not treat applyPreflight as a WorkspaceEdit.",
      "Confirm source doc-line writes wait for a language adapter formatter.",
      "Confirm rollback metadata is visible before a user approves any future apply."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P34 apply preflight evidence");
  assert.equal(hardFailures.length, 0, `W-P34 apply preflight evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P34 apply preflight evidence prepared at ${normalizePath(evidencePath)}`);
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function hasUnsafeApplyPreflight(preflight) {
  const status = typeof preflight.status === "string" ? preflight.status : "unknown";
  const rollback = isRecord(preflight.rollback) ? preflight.rollback : {};
  const targetFiles = Array.isArray(preflight.targetFiles) ? preflight.targetFiles : [];
  const targetFilesSafe = targetFiles.every((targetFile) => {
    const conflict = isRecord(targetFile.conflict) ? targetFile.conflict : {};
    const fileVersion = isRecord(targetFile.fileVersion) ? targetFile.fileVersion : {};
    const fileRollback = isRecord(targetFile.rollback) ? targetFile.rollback : {};
    return conflict.status === "not-checked"
      && fileVersion.status === "not-read"
      && fileRollback.strategy === "host-undo";
  });

  return !(status === "requires-host-check" || status === "not-applicable")
    || (status === "requires-host-check" && preflight.conflictStatus !== "not-checked")
    || (status === "requires-host-check" && preflight.requiresFileRead !== true)
    || (status === "requires-host-check" && preflight.requiresConflictCheck !== true)
    || (status === "requires-host-check" && rollback.strategy !== "host-undo")
    || (status === "requires-host-check" && targetFiles.length === 0)
    || !targetFilesSafe;
}

function countDirectEditObjects(value) {
  let count = 0;
  walkJson(value, (node) => {
    if (!isRecord(node)) {
      return;
    }

    if (Object.hasOwn(node, "workspaceEdit") || Object.hasOwn(node, "documentChanges") || Object.hasOwn(node, "changes")) {
      count += 1;
    }
  });
  return count;
}

function walkJson(value, visitor) {
  visitor(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walkJson(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      walkJson(item, visitor);
    }
  }
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = typeof value === "string" && value.length > 0 ? value : "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert(!serialized.includes("file://"), `${label} must not expose file URLs.`);
  assert(!/[A-Za-z]:[\\/]/u.test(serialized), `${label} must not expose drive-letter absolute paths.`);
  assert(!serialized.includes("work-zone"), `${label} must not expose private WorkZone markers.`);
  assert(!serialized.includes("\"sourcesContent\":"), `${label} must not embed sourcesContent.`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
