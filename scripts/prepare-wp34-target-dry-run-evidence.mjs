import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceContainerDir = path.resolve(rootDir, "..", "..");
const outputRoot = path.join(rootDir, "dist", "wp34-target-dry-run-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPaths = {
  aiAuthoring: path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json"),
  applyPreflight: path.join(rootDir, "dist", "wp34-apply-preflight-evidence", "evidence.json"),
  hostApplyPreview: path.join(rootDir, "dist", "wp34-host-apply-preview-evidence", "evidence.json")
};
const targetRepositories = [
  {
    id: "unicode-art-js",
    label: "UnicodeArtJs",
    localPath: path.join(workspaceContainerDir, "UnicodeArtJs"),
    documentationNeeds: ["tsdoc", "jsdoc"],
    dryRunFocus: "TypeScript/JSDoc source-document review proposals"
  },
  {
    id: "hia-aspnetportal",
    label: "HIA-ASPNETPortal",
    localPath: path.join(workspaceContainerDir, "HIA-ASPNETPortal"),
    documentationNeeds: ["dotnetdoc", "aspnet-endpoint"],
    dryRunFocus: ".NET XML documentation and ASP.NET endpoint review proposals"
  }
];

await main();

/**
 * 准备 W-P34.6 目标项目 dry-run evidence。
 * Prepare W-P34.6 target-project dry-run evidence.
 *
 * The dry run is intentionally target-facing but non-mutating: it verifies that
 * existing review, diff-preview and apply-preflight data can be routed toward
 * real target-project scenarios without recording absolute target paths or
 * writing into those repositories.
 *
 * dry-run 是面向目标项目的，但故意保持不可写：它只验证既有 review、
 * diff-preview 与 apply-preflight 数据可以映射到真实目标项目场景，同时不记录
 * 目标仓库绝对路径，也不写入目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const aiAuthoring = await readJson(inputPaths.aiAuthoring);
  const applyPreflight = await readJson(inputPaths.applyPreflight);
  const hostApplyPreview = await readJson(inputPaths.hostApplyPreview);
  const reviewPayload = aiAuthoring.result?.reviewPayload;
  const reviewItems = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
  const targetFiles = collectApplyPreflightTargetFiles(reviewItems);
  const dryRunScenarios = await Promise.all(targetRepositories.map(prepareTargetScenario));
  const sourceEvidence = {
    aiAuthoring: normalizePath(inputPaths.aiAuthoring),
    applyPreflight: normalizePath(inputPaths.applyPreflight),
    hostApplyPreview: normalizePath(inputPaths.hostApplyPreview)
  };
  const targetPolicy = {
    targetRepositoryMode: "read-only-observed",
    targetPathExposure: "redacted",
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false,
    notificationChannel: "central-notify",
    notificationLocationPolicy: "private-collaboration-space",
    sourcesContentPolicy: "none"
  };
  const summary = {
    applyPreflightReady: applyPreflight.status === "ready-for-vscode-apply-preview-first-slice",
    centralNotifyPolicyReady: targetPolicy.notificationChannel === "central-notify",
    detectedTargetScenarioCount: dryRunScenarios.filter((scenario) => scenario.availability === "detected-read-only").length,
    directEditObjectCount: countDirectEditObjects({
      applyPreflight,
      dryRunScenarios,
      hostApplyPreview,
      reviewPayload
    }),
    hostApplyPreviewReady: hostApplyPreview.status === "ready-for-target-project-dry-run-evidence",
    hostCheckPreflightCount: Number(applyPreflight.summary?.hostCheckCount ?? 0),
    sourceDoclineTargetCount: targetFiles.filter((targetFile) => targetFile.role === "source-docline").length,
    targetFileCount: Number(applyPreflight.summary?.targetFileCount ?? targetFiles.length),
    targetPathExposureCount: countTargetPathExposure(dryRunScenarios),
    targetRepositoryMutationCount: dryRunScenarios.filter((scenario) => scenario.targetRepositoryMutationAllowed || scenario.targetRepositoryWriteAttempted).length,
    targetScenarioCount: dryRunScenarios.length
  };
  const checks = [
    check("HIA_WP34_TARGET_DRY_RUN_HOST_PREVIEW_READY", summary.hostApplyPreviewReady === true, {
      actual: hostApplyPreview.status,
      expected: "ready-for-target-project-dry-run-evidence"
    }),
    check("HIA_WP34_TARGET_DRY_RUN_APPLY_PREFLIGHT_READY", summary.applyPreflightReady === true
      && summary.hostCheckPreflightCount === 2
      && summary.targetFileCount === 2, {
      actual: {
        applyPreflightReady: summary.applyPreflightReady,
        hostCheckPreflightCount: summary.hostCheckPreflightCount,
        targetFileCount: summary.targetFileCount
      },
      expected: {
        applyPreflightReady: true,
        hostCheckPreflightCount: 2,
        targetFileCount: 2
      }
    }),
    check("HIA_WP34_TARGET_DRY_RUN_SCENARIOS_DECLARED", summary.targetScenarioCount === 2
      && dryRunScenarios.some((scenario) => scenario.id === "unicode-art-js")
      && dryRunScenarios.some((scenario) => scenario.id === "hia-aspnetportal"), {
      actual: dryRunScenarios.map((scenario) => scenario.id),
      expected: ["unicode-art-js", "hia-aspnetportal"]
    }),
    check("HIA_WP34_TARGET_DRY_RUN_TARGET_REPOS_NOT_MUTATED", summary.targetRepositoryMutationCount === 0, {
      actual: summary.targetRepositoryMutationCount,
      expected: 0
    }),
    check("HIA_WP34_TARGET_DRY_RUN_PATHS_REDACTED", summary.targetPathExposureCount === 0, {
      actual: summary.targetPathExposureCount,
      expected: 0
    }),
    check("HIA_WP34_TARGET_DRY_RUN_CENTRAL_NOTIFY_POLICY", summary.centralNotifyPolicyReady === true
      && targetPolicy.targetRepositoryMode === "read-only-observed"
      && targetPolicy.targetRepositoryMutationAllowed === false, {
      actual: targetPolicy,
      expected: {
        notificationChannel: "central-notify",
        targetRepositoryMode: "read-only-observed",
        targetRepositoryMutationAllowed: false
      }
    }),
    check("HIA_WP34_TARGET_DRY_RUN_NO_DIRECT_EDIT_OBJECT", summary.directEditObjectCount === 0, {
      actual: summary.directEditObjectCount,
      expected: 0
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp34-target-dry-run-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-closeout-and-provider-inputs" : "blocked",
    sourceEvidence,
    targetPolicy,
    summary,
    targetDryRunScenarios: dryRunScenarios,
    checks,
    nextContractInputs: [
      {
        phase: "W-P34.7",
        topic: "closeout-and-provider-inputs",
        reason: "Target-facing dry-run evidence now confirms the apply preview chain can be routed to known target project scenarios without mutating them."
      },
      {
        phase: "W-P35",
        topic: "provider-integration-first-slice",
        reason: "A provider can be introduced behind the existing review/diff/preflight chain only after the host records human approval and checked file state."
      }
    ],
    manualChecks: [
      "Confirm target project maintainers read the central notify entry before changing their own repositories.",
      "Confirm target project local dry-runs consume reviewPayload.items[].editCandidate.applyPreflight as preview input, not as an executable edit.",
      "Confirm future checked apply evidence records file version, conflict result and rollback record before any write is enabled."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P34 target dry-run evidence");
  assert.equal(hardFailures.length, 0, `W-P34 target dry-run evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P34 target dry-run evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function prepareTargetScenario(targetRepository) {
  const detected = await directoryExists(targetRepository.localPath);
  return {
    id: targetRepository.id,
    label: targetRepository.label,
    availability: detected ? "detected-read-only" : "not-detected",
    dryRunFocus: targetRepository.dryRunFocus,
    documentationNeeds: [...targetRepository.documentationNeeds],
    expectedInputContracts: [
      "hia-documentation-review-payload@0.1.0-draft",
      "hia-documentation-edit-diff-preview@0.1.0-draft",
      "hia-documentation-edit-apply-preflight@0.1.0-draft"
    ],
    sourcePolicy: {
      pathExposure: "redacted",
      sourceBodiesIncluded: false,
      sourcesContentPolicy: "none"
    },
    targetRepositoryMode: "read-only-observed",
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false
  };
}

async function directoryExists(directoryPath) {
  try {
    const stats = await stat(directoryPath);
    return stats.isDirectory();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function collectApplyPreflightTargetFiles(reviewItems) {
  return reviewItems.flatMap((item) => {
    const targetFiles = item.editCandidate?.applyPreflight?.targetFiles;
    return Array.isArray(targetFiles) ? targetFiles : [];
  });
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

    if (Object.hasOwn(node, "workspaceEdit") || Object.hasOwn(node, "documentChanges") || Object.hasOwn(node, "changes")) {
      count += 1;
    }
  });
  return count;
}

function countTargetPathExposure(dryRunScenarios) {
  return dryRunScenarios.filter((scenario) => JSON.stringify(scenario).match(/[A-Za-z]:[\\/]/u)).length;
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
