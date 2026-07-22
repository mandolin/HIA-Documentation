import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp40-closeout-wp41-wp42-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutPath = path.join(outputRoot, "wp40-closeout-summary.md");
const downstreamPath = path.join(outputRoot, "wp41-wp42-inputs.md");
const inputEvidencePaths = {
  controlledSmokeIntake: path.join(rootDir, "dist", "wp40-controlled-remote-provider-smoke-intake", "evidence.json"),
  providerCandidateSelection: path.join(rootDir, "dist", "wp40-remote-provider-candidate-selection", "evidence.json"),
  secretNetworkConsent: path.join(rootDir, "dist", "wp40-secret-network-consent-packet", "evidence.json"),
  requestPreviewPrivacy: path.join(rootDir, "dist", "wp40-request-preview-privacy-dry-run", "evidence.json"),
  realSmokeExecutionGate: path.join(rootDir, "dist", "wp40-real-remote-provider-smoke-execution-gate", "evidence.json"),
  providerReviewLinkage: path.join(rootDir, "dist", "wp40-provider-result-review-linkage", "evidence.json")
};

await main();

/**
 * 准备 W-P40.7 closeout and W-P41/W-P42 inputs evidence。
 * Prepare W-P40.7 closeout and W-P41/W-P42 inputs evidence.
 *
 * This closeout summarizes the controlled remote provider smoke chain without
 * rewriting any previous gate. It records that the real remote call remained
 * blocked, while review-only provider result linkage became ready for the next
 * target-owner and checked-apply cycles.
 *
 * 中文：本收口阶段汇总受控 remote provider smoke 链路，不回写或改写前序 gate。
 * 它记录真实远端调用仍被阻断，同时确认 review-only provider result linkage
 * 已可作为后续 target-owner 与 checked-apply 周期输入。
 *
 * @returns {Promise<void>} Writes public-safe closeout evidence.
 */
async function main() {
  const inputs = await readInputs(inputEvidencePaths);
  const closeoutMatrix = createCloseoutMatrix(inputs);
  const downstreamInputs = createDownstreamInputs(inputs, closeoutMatrix);
  const summary = summarize(inputs, closeoutMatrix, downstreamInputs);
  const checks = [
    check("HIA_WP40_CLOSEOUT_INPUTS_READY", summary.inputEvidenceCount === 6
      && summary.readyInputEvidenceCount === 6
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP40_CLOSEOUT_CHAIN_COMPLETE", summary.completedPhaseCount === 7
      && summary.closeoutStatus === "completed-first-round"
      && summary.providerReviewLinkageReady === true
      && summary.blockedSmokeAcceptedAsCloseoutInput === true, {
      actual: {
        blockedSmokeAcceptedAsCloseoutInput: summary.blockedSmokeAcceptedAsCloseoutInput,
        closeoutStatus: summary.closeoutStatus,
        completedPhaseCount: summary.completedPhaseCount,
        providerReviewLinkageReady: summary.providerReviewLinkageReady
      }
    }),
    check("HIA_WP40_CLOSEOUT_NO_UNCLAIMED_EXECUTION", summary.realRemoteProviderInvocationExecuted === false
      && summary.externalNetworkCallExecuted === false
      && summary.destinationContactedCount === 0
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true, {
      actual: {
        destinationContactedCount: summary.destinationContactedCount,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        providerResultProduced: summary.providerResultProduced,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        refusalResultProduced: summary.refusalResultProduced
      }
    }),
    check("HIA_WP40_CLOSEOUT_DOWNSTREAM_INPUTS_READY", summary.downstreamInputCount >= 5
      && summary.wp41InputCount >= 2
      && summary.wp42InputCount >= 2
      && summary.wp43InputCount >= 1
      && summary.targetOwnerActionRequiredCount >= 1, {
      actual: {
        downstreamInputCount: summary.downstreamInputCount,
        targetOwnerActionRequiredCount: summary.targetOwnerActionRequiredCount,
        wp41InputCount: summary.wp41InputCount,
        wp42InputCount: summary.wp42InputCount,
        wp43InputCount: summary.wp43InputCount
      }
    }),
    check("HIA_WP40_CLOSEOUT_REVIEW_ONLY_NO_WRITE", summary.reviewOnlyOutputRequired === true
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        reviewOnlyOutputRequired: summary.reviewOnlyOutputRequired,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP40_CLOSEOUT_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.pathExposureCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp40-closeout-wp41-wp42-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp41-target-owner-branch-pr-smoke" : "blocked",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputEvidencePaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    closeoutMatrix,
    downstreamInputs,
    checks,
    generatedDocs: {
      closeoutSummary: normalizePath(closeoutPath),
      downstreamInputs: normalizePath(downstreamPath)
    },
    nextContractInputs: [
      {
        phase: "W-P41",
        topic: "target-owner-branch-pr-smoke",
        status: "ready-input",
        reason: "W-P40 closed without target mutation and provides review-only provider result input for target-owner controlled trials."
      },
      {
        phase: "W-P42",
        topic: "checked-apply-contract-hardening",
        status: "ready-input",
        reason: "W-P40 proves provider output must remain review-only, giving W-P42 concrete denial cases for checked apply hardening."
      },
      {
        phase: "W-P43",
        topic: "host-owned-apply-ux-and-provider-review-linkage",
        status: "ready-after-wp41-wp42",
        reason: "Host UX can later display provider result linkage alongside target-owner and checked-apply evidence."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P40 closeout W-P41/W-P42 inputs evidence");
  assert.equal(hardFailures.length, 0, `W-P40 closeout W-P41/W-P42 inputs has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutPath, renderCloseoutMarkdown(evidence), "utf8");
  await writeFile(downstreamPath, renderDownstreamMarkdown(evidence), "utf8");
  console.log(`W-P40 closeout W-P41/W-P42 inputs evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P40 closeout summary prepared at ${normalizePath(closeoutPath)}`);
  console.log(`W-P40 downstream inputs prepared at ${normalizePath(downstreamPath)}`);
}

async function readInputs(paths) {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, value]) => [key, await readJson(value)])
  );
  return Object.fromEntries(entries);
}

function createCloseoutMatrix(inputs) {
  return {
    contract: "hia-wp40-controlled-remote-provider-smoke-closeout-matrix",
    contractVersion: "0.1.0-draft",
    closeoutStatus: "completed-first-round",
    phases: [
      phase("W-P40.1", "controlled-smoke-intake", inputs.controlledSmokeIntake.status),
      phase("W-P40.2", "provider-candidate-selection", inputs.providerCandidateSelection.status),
      phase("W-P40.3", "secret-network-consent", inputs.secretNetworkConsent.status),
      phase("W-P40.4", "request-preview-privacy", inputs.requestPreviewPrivacy.status),
      phase("W-P40.5", "real-smoke-execution-gate", inputs.realSmokeExecutionGate.status),
      phase("W-P40.6", "provider-result-review-linkage", inputs.providerReviewLinkage.status),
      phase("W-P40.7", "closeout-and-downstream-inputs", "completed-first-round")
    ],
    decisions: [
      decision("real-remote-provider-call", "not-executed", "blocked-before-network"),
      decision("external-network-call", "not-executed", "destination-not-contacted"),
      decision("provider-result", "not-produced", "blocked-review-shape-used"),
      decision("provider-refusal-shape", "produced", "execution-gate-blocked"),
      decision("target-mutation", "not-executed", "target-owner-cycle-required"),
      decision("checked-apply", "not-triggered", "host-owned-contract-required")
    ]
  };
}

function createDownstreamInputs(inputs, closeoutMatrix) {
  return {
    contract: "hia-wp40-downstream-inputs",
    contractVersion: "0.1.0-draft",
    inputs: [
      downstream("W-P41", "target-owner-collaboration-policy", "ready-input", "Target branch, PR or sandbox must be created by target owner only."),
      downstream("W-P41", "blocked-provider-review-shape", "ready-input", "W-P40.6 review payload can be used in target-owner controlled trials without HIA mutation."),
      downstream("W-P42", "checked-apply-denial-case", "ready-input", "Blocked provider result should remain review-only and never trigger apply."),
      downstream("W-P42", "provider-output-action-policy", "ready-input", "Action policy denies direct apply, checked apply trigger, workspace write and target mutation."),
      downstream("W-P43", "host-provider-review-linkage", "ready-after-wp41-wp42", "Host UX can display provider result linkage once target-owner and checked-apply flows are hardened.")
    ],
    sourceStatuses: {
      closeout: closeoutMatrix.closeoutStatus,
      providerReviewLinkage: inputs.providerReviewLinkage.status,
      realSmokeExecutionGate: inputs.realSmokeExecutionGate.status
    }
  };
}

function phase(id, topic, status) {
  return {
    id,
    topic,
    status,
    completedFirstRound: true
  };
}

function decision(id, status, reason) {
  return {
    id,
    status,
    reason
  };
}

function downstream(phaseId, topic, status, reason) {
  return {
    phaseId,
    topic,
    status,
    reason,
    targetOwnerActionRequired: phaseId === "W-P41",
    reviewOnlyBoundaryRequired: true
  };
}

function summarize(inputs, closeoutMatrix, downstreamInputs) {
  const serializedPackets = JSON.stringify({ closeoutMatrix, downstreamInputs });
  return {
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputEvidenceCount: Object.values(inputs).filter((input) => isReadyStatus(input.status)).length,
    inputHardFailureCount: sum(Object.values(inputs).map((input) => input.summary?.hardFailureCount)),
    closeoutStatus: closeoutMatrix.closeoutStatus,
    completedPhaseCount: closeoutMatrix.phases.filter((item) => item.completedFirstRound === true).length,
    providerReviewLinkageReady: inputs.providerReviewLinkage.status === "ready-for-wp40-closeout-and-wp41-wp42-inputs",
    blockedSmokeAcceptedAsCloseoutInput: inputs.realSmokeExecutionGate.summary?.executionDecisionStatus === "blocked-before-network"
      && inputs.providerReviewLinkage.summary?.blockedResultShapeCount === 1,
    realRemoteProviderInvocationExecuted: anySummaryTrue(inputs, "realRemoteProviderInvocationExecuted"),
    externalNetworkCallExecuted: anySummaryTrue(inputs, "externalNetworkCallExecuted"),
    destinationContactedCount: sum(Object.values(inputs).map((input) => input.summary?.destinationContactedCount ?? input.summary?.contactDestinationCount)),
    providerResultProduced: anySummaryTrue(inputs, "providerResultProduced"),
    refusalResultProduced: inputs.providerReviewLinkage.summary?.refusalResultProduced === true,
    downstreamInputCount: downstreamInputs.inputs.length,
    wp41InputCount: downstreamInputs.inputs.filter((input) => input.phaseId === "W-P41").length,
    wp42InputCount: downstreamInputs.inputs.filter((input) => input.phaseId === "W-P42").length,
    wp43InputCount: downstreamInputs.inputs.filter((input) => input.phaseId === "W-P43").length,
    targetOwnerActionRequiredCount: downstreamInputs.inputs.filter((input) => input.targetOwnerActionRequired === true).length,
    reviewOnlyOutputRequired: inputs.providerReviewLinkage.summary?.reviewOnlyOutputRequired === true,
    directApplyAllowedCount: inputs.providerReviewLinkage.summary?.directApplyAllowedCount ?? 0,
    checkedApplyTriggeredCount: inputs.providerReviewLinkage.summary?.checkedApplyTriggeredCount ?? 0,
    workspaceWriteAllowedCount: sum(Object.values(inputs).map((input) => input.summary?.workspaceWriteAllowedCount)),
    targetRepositoryMutationCount: sum(Object.values(inputs).map((input) => input.summary?.targetRepositoryMutationCount)),
    directEditObjectCount: sum(Object.values(inputs).map((input) => input.summary?.directEditObjectCount)) + countDirectEditObjects({ closeoutMatrix, downstreamInputs }),
    credentialValueIncludedCount: inputs.providerReviewLinkage.summary?.credentialValueIncludedCount ?? 0,
    sourceReferenceIncludedCount: inputs.providerReviewLinkage.summary?.sourceReferenceIncludedCount ?? 0,
    sourceTextIncludedCount: inputs.providerReviewLinkage.summary?.sourceTextIncludedCount ?? 0,
    sourcesContentPolicy: inputs.providerReviewLinkage.summary?.sourcesContentPolicy ?? "none",
    credentialMaterialMarkerCount: countCredentialMaterialMarkers({ closeoutMatrix, downstreamInputs }),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers({ closeoutMatrix, downstreamInputs }),
    pathExposureCount: countPathExposure(serializedPackets)
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function isReadyStatus(status) {
  return typeof status === "string" && (status.startsWith("ready-") || status === "completed-first-round");
}

function anySummaryTrue(inputs, key) {
  return Object.values(inputs).some((input) => input.summary?.[key] === true);
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function countDirectEditObjects(value) {
  return countMatchingKeys(value, /^(workspaceEdit|documentChanges|changes|patch|edits)$/u)
    + countMatchingValues(value, /TextEdit\[/iu);
}

function countCredentialMaterialMarkers(value) {
  return countMatchingKeys(value, /^(secretValue|apiKeyValue|tokenValue|password|authorizationHeader)$/u)
    + countMatchingValues(value, /(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u);
}

function countForbiddenDocumentTextMarkers(value) {
  return countMatchingKeys(value, /^(sourceText|sourceBody|rawSource|sourceExcerpt|documentText|documentContent|sourcesContent)$/u);
}

function countPathExposure(serialized) {
  return /[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countMatchingKeys(value, pattern) {
  let count = 0;
  visitEntries(value, (key) => {
    if (pattern.test(key)) {
      count += 1;
    }
  });
  return count;
}

function countMatchingValues(value, pattern) {
  let count = 0;
  visitValues(value, (candidate) => {
    if (pattern.test(candidate)) {
      count += 1;
    }
  });
  return count;
}

function visitEntries(value, visitor) {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitEntries(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      visitor(key);
      visitEntries(item, visitor);
    }
  }
}

function visitValues(value, visitor) {
  if (typeof value === "string") {
    visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      visitValues(item, visitor);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      visitValues(item, visitor);
    }
  }
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//u, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /work-zone/u, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent":/u, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/u, `${label} must not include token-looking values.`);
}

function renderCloseoutMarkdown(evidence) {
  const { closeoutMatrix, summary } = evidence;
  const lines = [
    "# W-P40 Closeout Summary",
    "",
    `Status: \`${evidence.status}\``,
    `Closeout: \`${summary.closeoutStatus}\``,
    `Completed phases: ${summary.completedPhaseCount}`,
    `Real provider invocation executed: ${summary.realRemoteProviderInvocationExecuted}`,
    `External network call executed: ${summary.externalNetworkCallExecuted}`,
    "",
    "| Phase | Topic | Status |",
    "| --- | --- | --- |"
  ];

  for (const item of closeoutMatrix.phases) {
    lines.push(`| ${item.id} | ${item.topic} | \`${item.status}\` |`);
  }

  lines.push("");
  lines.push("W-P40 is closed as a controlled remote provider smoke cycle with blocked-before-network evidence and review-only result linkage.");
  return `${lines.join("\n")}\n`;
}

function renderDownstreamMarkdown(evidence) {
  const { downstreamInputs } = evidence;
  const lines = [
    "# W-P40 Downstream Inputs",
    "",
    "| Phase | Topic | Status |",
    "| --- | --- | --- |"
  ];

  for (const item of downstreamInputs.inputs) {
    lines.push(`| ${item.phaseId} | ${item.topic} | \`${item.status}\` |`);
  }

  lines.push("");
  lines.push("Downstream cycles must keep provider output review-only and preserve target-owner action for branch, PR or sandbox work.");
  return `${lines.join("\n")}\n`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
