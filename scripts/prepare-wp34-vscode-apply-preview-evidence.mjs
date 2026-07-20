import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp34-vscode-apply-preview-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const aiAuthoringPath = path.join(rootDir, "dist", "ai-authoring-proposals-evidence", "evidence.json");
const vscodeExtensionSourcePath = path.join(rootDir, "apps", "vscode-extension", "src", "extension.ts");

const {
  createHiaDocumentationReviewItemChoices,
  createHiaDocumentationReviewItemReport,
  createHiaDocumentationReviewReport
} = await import(pathToFileURL(path.join(rootDir, "apps", "vscode-extension", "dist", "config.js")).href);

await main();

/**
 * 准备 W-P34.4 VS Code apply preview first-slice 证据。
 * Prepare W-P34.4 evidence for the VS Code apply-preview first slice.
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const aiAuthoring = JSON.parse(await readFile(aiAuthoringPath, "utf8"));
  const extensionSource = await readFile(vscodeExtensionSourcePath, "utf8");
  const reviewPayload = aiAuthoring.result?.reviewPayload;
  const items = Array.isArray(reviewPayload?.items) ? reviewPayload.items : [];
  const choices = createHiaDocumentationReviewItemChoices(reviewPayload);
  const reports = items.map((item) => createHiaDocumentationReviewItemReport(item));
  const reviewReport = createHiaDocumentationReviewReport(aiAuthoring.result);
  const hostPreflightChoiceCount = choices.filter((choice) => String(choice.detail ?? "").includes("host preflight")).length;
  const applyPreflightReportCount = reports.filter((lines) => lines.some((line) => line.startsWith("Apply preflight:"))).length;
  const applyDisabled = reviewPayload?.actionPolicy?.deniedActions?.includes("apply-workspace-edit")
    && items.every((item) => item.actionHints?.applyAvailable === false);
  const summary = {
    applyDisabled,
    applyPreflightReportCount,
    choiceCount: choices.length,
    directEditObjectCount: countDirectEditObjects({
      choices,
      reviewPayload,
      reviewReport
    }),
    hostPreflightChoiceCount,
    itemCount: items.length,
    sourceActionDeclared: extensionSource.includes("Show apply preflight preview"),
    sourceDirectApplyDisabled: extensionSource.includes("Direct apply: disabled")
      && extensionSource.includes("Workspace write: disabled")
  };
  const checks = [
    check("HIA_WP34_VSCODE_PREVIEW_CHOICES_INCLUDE_HOST_PREFLIGHT", summary.choiceCount === 4 && summary.hostPreflightChoiceCount === 2, {
      actual: {
        choiceCount: summary.choiceCount,
        hostPreflightChoiceCount: summary.hostPreflightChoiceCount
      },
      expected: {
        choiceCount: 4,
        hostPreflightChoiceCount: 2
      }
    }),
    check("HIA_WP34_VSCODE_PREVIEW_REPORTS_INCLUDE_PREFLIGHT", summary.applyPreflightReportCount === summary.itemCount && summary.itemCount > 0, {
      actual: summary.applyPreflightReportCount,
      expected: summary.itemCount
    }),
    check("HIA_WP34_VSCODE_PREVIEW_SOURCE_ACTION_DECLARED", summary.sourceActionDeclared === true, {
      actual: summary.sourceActionDeclared,
      expected: true
    }),
    check("HIA_WP34_VSCODE_PREVIEW_APPLY_DISABLED", summary.applyDisabled === true && summary.sourceDirectApplyDisabled === true, {
      actual: {
        applyDisabled: summary.applyDisabled,
        sourceDirectApplyDisabled: summary.sourceDirectApplyDisabled
      },
      expected: {
        applyDisabled: true,
        sourceDirectApplyDisabled: true
      }
    }),
    check("HIA_WP34_VSCODE_PREVIEW_NO_DIRECT_EDIT_OBJECT", summary.directEditObjectCount === 0, {
      actual: summary.directEditObjectCount,
      expected: 0
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp34-vscode-apply-preview-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-devtools-visual-studio-apply-preview-inputs" : "blocked",
    sourceEvidence: {
      aiAuthoring: normalizePath(aiAuthoringPath),
      vscodeConfig: "apps/vscode-extension/dist/config.js",
      vscodeExtensionSource: "apps/vscode-extension/src/extension.ts"
    },
    summary,
    checks,
    nextContractInputs: [
      {
        phase: "W-P34.5",
        topic: "devtools-and-visual-studio-apply-preview-inputs",
        reason: "VS Code can now display apply preflight preview while apply remains disabled."
      },
      {
        phase: "W-P34.6",
        topic: "target-project-dry-run-evidence",
        reason: "Target projects can later validate checked preflight without letting this repository mutate them."
      }
    ],
    manualChecks: [
      "Open VS Code Extension Development Host and confirm the review action list includes Show apply preflight preview.",
      "Confirm the output channel shows file-version-not-read, conflict not-checked and rollback record required.",
      "Confirm Apply edit remains disabled and no workspace file changes occur."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P34 VS Code apply preview evidence");
  assert.equal(hardFailures.length, 0, `W-P34 VS Code apply preview evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P34 VS Code apply preview evidence prepared at ${normalizePath(evidencePath)}`);
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
