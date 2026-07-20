import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp34-diff-preview-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPath = path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json");

await main();

/**
 * 准备 W-P34.2 edit-candidate semantic diff preview 证据。
 * Prepare W-P34.2 evidence for edit-candidate semantic diff previews.
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const aiAuthoring = JSON.parse(await readFile(inputPath, "utf8"));
  const reviewPayload = aiAuthoring.result?.reviewPayload;
  const reviewItems = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
  const editCandidates = reviewItems.map((item) => item.editCandidate).filter(isRecord);
  const diffPreviews = editCandidates.map((candidate) => candidate.diffPreview).filter(isRecord);
  const operations = diffPreviews.flatMap((preview) => Array.isArray(preview.operations) ? preview.operations : []);
  const previewOnly = diffPreviews.filter((preview) => preview.status === "preview-only");
  const unavailable = diffPreviews.filter((preview) => preview.status === "unavailable");
  const externalLocaleOperation = operations.find((operation) => operation.op === "add-locale-entry");
  const sourceDoclineOperation = operations.find((operation) => operation.op === "insert-source-docline");
  const summary = {
    candidateCount: editCandidates.length,
    diffPreviewCount: diffPreviews.length,
    directEditObjectCount: countDirectEditObjects(reviewPayload),
    externalLocaleOperationCount: operations.filter((operation) => operation.op === "add-locale-entry").length,
    operationCount: operations.length,
    previewOnlyCount: previewOnly.length,
    sourceDoclineOperationCount: operations.filter((operation) => operation.op === "insert-source-docline").length,
    unavailableCount: unavailable.length,
    unsafeDiffPreviewCount: diffPreviews.filter(hasUnsafeDiffPreviewSafety).length
  };
  const checks = [
    check("HIA_WP34_DIFF_PREVIEW_CONTRACT_PRESENT", summary.diffPreviewCount === summary.candidateCount && summary.diffPreviewCount > 0, {
      actual: summary.diffPreviewCount,
      expected: summary.candidateCount
    }),
    check("HIA_WP34_DIFF_PREVIEW_STATUS_SPLIT", summary.previewOnlyCount === 2 && summary.unavailableCount === 2, {
      actual: {
        previewOnlyCount: summary.previewOnlyCount,
        unavailableCount: summary.unavailableCount
      },
      expected: {
        previewOnlyCount: 2,
        unavailableCount: 2
      }
    }),
    check("HIA_WP34_DIFF_PREVIEW_OPERATIONS_PRESENT", summary.operationCount === 2 && summary.externalLocaleOperationCount === 1 && summary.sourceDoclineOperationCount === 1, {
      actual: {
        externalLocaleOperationCount: summary.externalLocaleOperationCount,
        operationCount: summary.operationCount,
        sourceDoclineOperationCount: summary.sourceDoclineOperationCount
      },
      expected: {
        externalLocaleOperationCount: 1,
        operationCount: 2,
        sourceDoclineOperationCount: 1
      }
    }),
    check("HIA_WP34_DIFF_PREVIEW_EXTERNAL_RESOURCE_TARGET", isRecord(externalLocaleOperation)
      && externalLocaleOperation.path === "i18n/profile.hia-i18n.json"
      && externalLocaleOperation.pointer === "/en/profile.render.description"
      && externalLocaleOperation.locale === "en", {
      actual: externalLocaleOperation ?? null,
      expected: {
        locale: "en",
        path: "i18n/profile.hia-i18n.json",
        pointer: "/en/profile.render.description"
      }
    }),
    check("HIA_WP34_DIFF_PREVIEW_SOURCE_DOCLINE_TARGET", isRecord(sourceDoclineOperation)
      && sourceDoclineOperation.path === "src/sample.toy"
      && sourceDoclineOperation.symbolId === "toy:helper", {
      actual: sourceDoclineOperation ?? null,
      expected: {
        path: "src/sample.toy",
        symbolId: "toy:helper"
      }
    }),
    check("HIA_WP34_DIFF_PREVIEW_NON_EXECUTABLE", summary.unsafeDiffPreviewCount === 0, {
      actual: summary.unsafeDiffPreviewCount,
      expected: 0
    }),
    check("HIA_WP34_DIFF_PREVIEW_NO_DIRECT_EDIT_OBJECT", summary.directEditObjectCount === 0, {
      actual: summary.directEditObjectCount,
      expected: 0
    }),
    check("HIA_WP34_DIFF_PREVIEW_LIMITATIONS_EXPLICIT", diffPreviews.every((preview) => Array.isArray(preview.limitations) && preview.limitations.includes("not-a-workspace-edit")), {
      actual: diffPreviews.map((preview) => preview.limitations ?? []),
      expected: "Every diff preview includes not-a-workspace-edit."
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp34-diff-preview-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-conflict-version-rollback-metadata" : "blocked",
    sourceEvidence: {
      aiAuthoring: normalizePath(inputPath)
    },
    summary,
    diffPreviewKinds: countBy(diffPreviews.map((preview) => preview.targetKind ?? "unknown")),
    operationKinds: countBy(operations.map((operation) => operation.op ?? "unknown")),
    checks,
    nextContractInputs: [
      {
        phase: "W-P34.3",
        topic: "conflict-version-rollback-metadata",
        reason: "Diff previews now describe semantic operations, but do not yet bind file versions or conflict checks."
      },
      {
        phase: "W-P34.4",
        topic: "vscode-apply-preview-first-slice",
        reason: "VS Code can display diff previews before a later human-approved apply path is enabled."
      }
    ],
    manualChecks: [
      "Confirm hosts display diffPreview as a semantic preview and not as a runnable patch.",
      "Confirm file version and conflict metadata are added before any host-side apply command exists.",
      "Confirm source-docline preview text is reviewed and formatted by a language adapter before writing.",
      "Confirm external locale entry previews remain workspace-relative and do not reveal private absolute paths."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P34 diff preview evidence");
  assert.equal(hardFailures.length, 0, `W-P34 diff preview evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P34 diff preview evidence prepared at ${normalizePath(evidencePath)}`);
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function hasUnsafeDiffPreviewSafety(preview) {
  const safety = isRecord(preview.safety) ? preview.safety : {};
  return safety.directApply !== false
    || safety.executable !== false
    || safety.hostWrite !== false
    || safety.includesSourceContent !== false
    || safety.requiresHumanReview !== true
    || safety.sourcesContentPolicy !== "none";
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
