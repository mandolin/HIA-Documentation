import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp34-host-apply-preview-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputPaths = {
  devtools: path.join(rootDir, "dist", "devtools-extension-check.json"),
  visualStudio: path.join(rootDir, "dist", "visual-studio-extension-check.json"),
  vscodeApplyPreview: path.join(rootDir, "dist", "wp34-vscode-apply-preview-evidence", "evidence.json")
};

await main();

/**
 * 准备 W-P34.5 DevTools / Visual Studio apply-preview input evidence。
 * Prepare W-P34.5 evidence for DevTools and Visual Studio apply-preview inputs.
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const devtools = await readJson(inputPaths.devtools);
  const visualStudio = await readJson(inputPaths.visualStudio);
  const vscodeApplyPreview = await readJson(inputPaths.vscodeApplyPreview);
  const devtoolsApplyPreview = devtools.panel?.reviewSurface?.applyPreview;
  const visualStudioApplyPreview = visualStudio.reviewSurface?.applyPreview;
  const summary = {
    devtoolsApplyAvailable: devtoolsApplyPreview?.applyAvailable === true,
    devtoolsHostCheckPreflightCount: Number(devtoolsApplyPreview?.hostCheckPreflightCount ?? 0),
    devtoolsInputReady: devtoolsApplyPreview?.status === "input-ready",
    devtoolsTargetFileCount: Number(devtoolsApplyPreview?.targetFileCount ?? 0),
    directEditObjectCount: countDirectEditObjects({
      devtools,
      visualStudio,
      vscodeApplyPreview
    }),
    visualStudioCheckedApplyAvailable: visualStudioApplyPreview?.checkedApplyAvailable === true,
    visualStudioDisabledApply: visualStudio.reviewSurface?.disabledApply === true,
    visualStudioHostFileReadAvailable: visualStudioApplyPreview?.hostFileReadAvailable === true,
    visualStudioInputReady: visualStudioApplyPreview?.status === "input-ready",
    visualStudioWorkspaceWriteAvailable: visualStudioApplyPreview?.workspaceWriteAvailable === true,
    vscodeApplyDisabled: vscodeApplyPreview.summary?.applyDisabled === true
  };
  const checks = [
    check("HIA_WP34_HOST_APPLY_PREVIEW_DEVTOOLS_INPUT_READY", summary.devtoolsInputReady === true && summary.devtoolsHostCheckPreflightCount === 1 && summary.devtoolsTargetFileCount === 1, {
      actual: {
        hostCheckPreflightCount: summary.devtoolsHostCheckPreflightCount,
        inputReady: summary.devtoolsInputReady,
        targetFileCount: summary.devtoolsTargetFileCount
      },
      expected: {
        hostCheckPreflightCount: 1,
        inputReady: true,
        targetFileCount: 1
      }
    }),
    check("HIA_WP34_HOST_APPLY_PREVIEW_DEVTOOLS_APPLY_DISABLED", summary.devtoolsApplyAvailable === false
      && devtoolsApplyPreview?.checkedApply === false
      && devtoolsApplyPreview?.hostFileRead === false
      && devtoolsApplyPreview?.hostWrite === false
      && devtoolsApplyPreview?.targetRepositoryMutation === false, {
      actual: devtoolsApplyPreview,
      expected: {
        applyAvailable: false,
        checkedApply: false,
        hostFileRead: false,
        hostWrite: false,
        targetRepositoryMutation: false
      }
    }),
    check("HIA_WP34_HOST_APPLY_PREVIEW_VISUAL_STUDIO_INPUT_READY", summary.visualStudioInputReady === true
      && Array.isArray(visualStudioApplyPreview?.requiredFields)
      && visualStudioApplyPreview.requiredFields.includes("item.editCandidate.applyPreflight.targetFiles"), {
      actual: visualStudioApplyPreview,
      expected: {
        requiredField: "item.editCandidate.applyPreflight.targetFiles",
        status: "input-ready"
      }
    }),
    check("HIA_WP34_HOST_APPLY_PREVIEW_VISUAL_STUDIO_APPLY_DISABLED", summary.visualStudioDisabledApply === true
      && summary.visualStudioCheckedApplyAvailable === false
      && summary.visualStudioHostFileReadAvailable === false
      && summary.visualStudioWorkspaceWriteAvailable === false
      && visualStudioApplyPreview?.targetRepositoryMutation === false, {
      actual: {
        checkedApplyAvailable: summary.visualStudioCheckedApplyAvailable,
        disabledApply: summary.visualStudioDisabledApply,
        hostFileReadAvailable: summary.visualStudioHostFileReadAvailable,
        targetRepositoryMutation: visualStudioApplyPreview?.targetRepositoryMutation,
        workspaceWriteAvailable: summary.visualStudioWorkspaceWriteAvailable
      },
      expected: {
        checkedApplyAvailable: false,
        disabledApply: true,
        hostFileReadAvailable: false,
        targetRepositoryMutation: false,
        workspaceWriteAvailable: false
      }
    }),
    check("HIA_WP34_HOST_APPLY_PREVIEW_VSCODE_STILL_DISABLED", summary.vscodeApplyDisabled === true, {
      actual: summary.vscodeApplyDisabled,
      expected: true
    }),
    check("HIA_WP34_HOST_APPLY_PREVIEW_NO_DIRECT_EDIT_OBJECT", summary.directEditObjectCount === 0, {
      actual: summary.directEditObjectCount,
      expected: 0
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp34-host-apply-preview-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-target-project-dry-run-evidence" : "blocked",
    sourceEvidence: {
      devtools: normalizePath(inputPaths.devtools),
      visualStudio: normalizePath(inputPaths.visualStudio),
      vscodeApplyPreview: normalizePath(inputPaths.vscodeApplyPreview)
    },
    summary,
    hostInputs: {
      devtools: {
        applyPreview: devtoolsApplyPreview,
        reviewSurface: {
          applyAvailableCount: devtools.panel?.reviewSurface?.applyAvailableCount,
          contract: devtools.panel?.reviewSurface?.contract,
          itemCount: devtools.panel?.reviewSurface?.itemCount
        }
      },
      visualStudio: {
        applyPreview: visualStudioApplyPreview,
        reviewSurface: {
          disabledApply: visualStudio.reviewSurface?.disabledApply,
          editApplyPreflightContract: visualStudio.reviewSurface?.editApplyPreflightContract,
          surfaceId: visualStudio.reviewSurface?.surfaceId
        }
      }
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P34.6",
        topic: "target-project-dry-run-evidence",
        reason: "DevTools and Visual Studio now declare apply-preview inputs without claiming checked apply or workspace write capability."
      },
      {
        phase: "W-P34.7",
        topic: "closeout-and-provider-inputs",
        reason: "Provider integration can depend on host-neutral review, diff preview and preflight metadata without bypassing human review."
      }
    ],
    manualChecks: [
      "Confirm DevTools panel shows apply-preview input counts but does not provide an apply button.",
      "Confirm Visual Studio tool-window design treats applyPreview as required input, not as write permission.",
      "Confirm checked apply remains unavailable until a host reads target files and records conflict/rollback results."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P34 host apply preview evidence");
  assert.equal(hardFailures.length, 0, `W-P34 host apply preview evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P34 host apply preview evidence prepared at ${normalizePath(evidencePath)}`);
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
