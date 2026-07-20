import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp34-closeout-provider-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const inputDefinitions = [
  {
    id: "apply-boundary-audit",
    path: path.join(rootDir, "dist", "wp34-apply-boundary-audit", "evidence.json"),
    expectedStatus: "ready-for-edit-candidate-diff-contract"
  },
  {
    id: "diff-preview",
    path: path.join(rootDir, "dist", "wp34-diff-preview-evidence", "evidence.json"),
    expectedStatus: "ready-for-conflict-version-rollback-metadata"
  },
  {
    id: "apply-preflight",
    path: path.join(rootDir, "dist", "wp34-apply-preflight-evidence", "evidence.json"),
    expectedStatus: "ready-for-vscode-apply-preview-first-slice"
  },
  {
    id: "vscode-apply-preview",
    path: path.join(rootDir, "dist", "wp34-vscode-apply-preview-evidence", "evidence.json"),
    expectedStatus: "ready-for-devtools-visual-studio-apply-preview-inputs"
  },
  {
    id: "host-apply-preview",
    path: path.join(rootDir, "dist", "wp34-host-apply-preview-evidence", "evidence.json"),
    expectedStatus: "ready-for-target-project-dry-run-evidence"
  },
  {
    id: "target-dry-run",
    path: path.join(rootDir, "dist", "wp34-target-dry-run-evidence", "evidence.json"),
    expectedStatus: "ready-for-closeout-and-provider-inputs"
  }
];

await main();

/**
 * 准备 W-P34.7 closeout and provider-input evidence。
 * Prepare W-P34.7 closeout and provider-input evidence.
 *
 * This evidence closes W-P34 by proving that the apply/edit chain has a
 * reviewable preview path, but still has no executable edit object, target
 * repository mutation or provider bypass.
 *
 * 本 evidence 用于收口 W-P34：证明 apply/edit 链路已经有可审查的预览路径，
 * 同时仍没有可执行编辑对象、目标仓库写入或 provider 绕过能力。
 *
 * @returns {Promise<void>} Writes public-safe evidence under `dist/`.
 */
async function main() {
  const inputReports = await Promise.all(inputDefinitions.map(readInputReport));
  const byId = Object.fromEntries(inputReports.map((report) => [report.id, report]));
  const providerGate = {
    integrationMode: "review-payload-in-provider-out-review-only",
    acceptedInputContracts: [
      "hia-ai-context-package@0.1.0-draft",
      "hia-documentation-review-payload@0.1.0-draft",
      "hia-documentation-edit-diff-preview@0.1.0-draft",
      "hia-documentation-edit-apply-preflight@0.1.0-draft"
    ],
    deniedProviderCapabilities: [
      "direct-workspace-write",
      "direct-workspace-edit-object",
      "target-repository-mutation",
      "source-body-embedding",
      "bypass-human-review"
    ],
    directApplyAllowed: false,
    directEditObjectAllowed: false,
    targetRepositoryMutationAllowed: false,
    requiresBeforeCheckedApply: [
      "human-approval-record",
      "host-file-read",
      "file-version-result",
      "conflict-result",
      "rollback-record",
      "host-supported-formatter"
    ],
    sourcesContentPolicy: "none"
  };
  const summary = {
    directApplyAllowed: providerGate.directApplyAllowed,
    directEditObjectCount: countDirectEditObjects(inputReports.map((report) => report.evidence)),
    evidenceInputCount: inputReports.length,
    hardFailureCount: inputReports.reduce((total, report) => total + report.hardFailureCount, 0),
    hostApplyStillDisabled: hostApplyStillDisabled(byId["host-apply-preview"]?.evidence),
    providerGateReady: providerGate.directApplyAllowed === false
      && providerGate.directEditObjectAllowed === false
      && providerGate.targetRepositoryMutationAllowed === false,
    readyEvidenceInputCount: inputReports.filter((report) => report.status === report.expectedStatus).length,
    targetDryRunReady: byId["target-dry-run"]?.status === "ready-for-closeout-and-provider-inputs",
    targetRepositoryMutationCount: Number(byId["target-dry-run"]?.evidence.summary?.targetRepositoryMutationCount ?? -1),
    targetScenarioCount: Number(byId["target-dry-run"]?.evidence.summary?.targetScenarioCount ?? 0)
  };
  const checks = [
    check("HIA_WP34_CLOSEOUT_ALL_EVIDENCE_READY", summary.readyEvidenceInputCount === inputReports.length, {
      actual: inputReports.map(({ id, status }) => ({ id, status })),
      expected: inputReports.map(({ id, expectedStatus }) => ({ id, status: expectedStatus }))
    }),
    check("HIA_WP34_CLOSEOUT_NO_HARD_FAILURES", summary.hardFailureCount === 0, {
      actual: summary.hardFailureCount,
      expected: 0
    }),
    check("HIA_WP34_CLOSEOUT_NO_DIRECT_EDIT_OBJECT", summary.directEditObjectCount === 0, {
      actual: summary.directEditObjectCount,
      expected: 0
    }),
    check("HIA_WP34_CLOSEOUT_HOST_APPLY_STILL_DISABLED", summary.hostApplyStillDisabled === true, {
      actual: byId["host-apply-preview"]?.evidence.summary ?? null,
      expected: {
        devtoolsApplyAvailable: false,
        visualStudioCheckedApplyAvailable: false,
        visualStudioWorkspaceWriteAvailable: false,
        vscodeApplyDisabled: true
      }
    }),
    check("HIA_WP34_CLOSEOUT_TARGET_DRY_RUN_READY", summary.targetDryRunReady === true
      && summary.targetScenarioCount === 2
      && summary.targetRepositoryMutationCount === 0, {
      actual: {
        targetDryRunReady: summary.targetDryRunReady,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetScenarioCount: summary.targetScenarioCount
      },
      expected: {
        targetDryRunReady: true,
        targetRepositoryMutationCount: 0,
        targetScenarioCount: 2
      }
    }),
    check("HIA_WP34_CLOSEOUT_PROVIDER_GATE_REVIEW_ONLY", summary.providerGateReady === true
      && providerGate.deniedProviderCapabilities.includes("direct-workspace-write")
      && providerGate.requiresBeforeCheckedApply.includes("conflict-result"), {
      actual: providerGate,
      expected: {
        deniedProviderCapability: "direct-workspace-write",
        directApplyAllowed: false,
        requiredBeforeCheckedApply: "conflict-result"
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp34-closeout-provider-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp35-provider-integration-first-slice" : "blocked",
    sourceEvidence: Object.fromEntries(inputReports.map((report) => [report.id, normalizePath(report.path)])),
    summary,
    evidenceInputs: inputReports.map(({ contract, contractVersion, hardFailureCount, id, status }) => ({
      contract,
      contractVersion,
      hardFailureCount,
      id,
      status
    })),
    providerGate,
    checks,
    nextContractInputs: [
      {
        phase: "W-P35",
        topic: "provider-integration-first-slice",
        reason: "W-P34 now has review, diff-preview, apply-preflight, host-preview and target dry-run evidence while still denying direct writes."
      },
      {
        phase: "W-P35",
        topic: "checked-apply-still-deferred",
        reason: "Checked apply still requires a separate host-side contract for file reads, conflict results, rollback records and user confirmation."
      }
    ],
    manualChecks: [
      "Confirm the first provider integration consumes bounded review input and returns reviewable draft output only.",
      "Confirm no provider response is treated as a WorkspaceEdit before host-side checked apply is designed.",
      "Confirm target projects continue to absorb changes through central notify and their own local decisions."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P34 closeout provider-input evidence");
  assert.equal(hardFailures.length, 0, `W-P34 closeout provider-input evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  console.log(`W-P34 closeout provider-input evidence prepared at ${normalizePath(evidencePath)}`);
}

async function readInputReport(inputDefinition) {
  const evidence = JSON.parse(await readFile(inputDefinition.path, "utf8"));
  const checks = Array.isArray(evidence.checks) ? evidence.checks : [];
  return {
    contract: evidence.contract,
    contractVersion: evidence.contractVersion,
    evidence,
    expectedStatus: inputDefinition.expectedStatus,
    hardFailureCount: checks.filter((item) => item.status === "fail").length,
    id: inputDefinition.id,
    path: inputDefinition.path,
    status: evidence.status
  };
}

function hostApplyStillDisabled(evidence) {
  const summary = evidence?.summary;
  return summary?.devtoolsApplyAvailable === false
    && summary?.visualStudioCheckedApplyAvailable === false
    && summary?.visualStudioWorkspaceWriteAvailable === false
    && summary?.vscodeApplyDisabled === true;
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
