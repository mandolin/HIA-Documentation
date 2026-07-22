import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp42-provider-review-target-owner-boundary");
const evidencePath = path.join(outputRoot, "evidence.json");
const boundarySummaryPath = path.join(outputRoot, "provider-review-target-owner-boundary-summary.md");
const rollbackAuditHardeningPath = path.join(rootDir, "dist", "wp42-rollback-formatter-audit-hardening", "evidence.json");
const providerReviewLinkagePath = path.join(rootDir, "dist", "wp40-provider-result-review-linkage", "evidence.json");
const providerReviewHandoffPath = path.join(rootDir, "dist", "wp41-provider-review-payload-handoff", "evidence.json");
const targetOwnerDryRunPath = path.join(rootDir, "dist", "wp41-target-owner-dry-run-evidence", "evidence.json");

await main();

/**
 * 准备 W-P42.5 provider review 与 target-owner boundary evidence。
 * Prepare W-P42.5 provider review and target-owner boundary evidence.
 *
 * This stage binds provider review payloads and target-owner evidence as
 * context/reference-only inputs after rollback/formatter/audit controls pass.
 * It rejects executable provider output, apply triggers, network claims and
 * target-owner execution claims before any host write can be considered.
 *
 * 中文：本阶段在 rollback/formatter/audit controls 通过后，把 provider review payload
 * 与 target-owner evidence 绑定为 context/reference-only 输入。它会在任何宿主写入前拒绝
 * 可执行 provider 输出、apply trigger、network claim 与 target-owner execution claim。
 *
 * @returns {Promise<void>} Writes public-safe W-P42.5 boundary evidence and summary.
 */
async function main() {
  const inputs = await readInputs();
  const controls = createBoundaryControls();
  const fixtures = createFixtures(controls);
  const checkerResults = fixtures.map((fixture) => runBoundaryChecker(fixture, controls));
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    checkerResults,
    controls,
    fixtures,
    inputs,
    nextStageInputs
  });
  const checks = [
    check("HIA_WP42_PROVIDER_TARGET_INPUTS_READY", summary.rollbackAuditHardeningReady === true
      && summary.providerReviewLinkageReady === true
      && summary.providerReviewHandoffReady === true
      && summary.targetOwnerDryRunReady === true
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputHardFailureCount: summary.inputHardFailureCount,
        providerReviewHandoffReady: summary.providerReviewHandoffReady,
        providerReviewLinkageReady: summary.providerReviewLinkageReady,
        rollbackAuditHardeningReady: summary.rollbackAuditHardeningReady,
        targetOwnerDryRunReady: summary.targetOwnerDryRunReady
      }
    }),
    check("HIA_WP42_PROVIDER_TARGET_CONTROL_COVERAGE", summary.boundaryControlCount >= 10
      && summary.requiredBoundaryControlCount === summary.boundaryControlCount
      && summary.fixtureCount === summary.boundaryControlCount + 1, {
      actual: {
        boundaryControlCount: summary.boundaryControlCount,
        fixtureCount: summary.fixtureCount,
        requiredBoundaryControlCount: summary.requiredBoundaryControlCount
      }
    }),
    check("HIA_WP42_PROVIDER_TARGET_DENIAL_FIXTURES", summary.denialFixtureCount === summary.deniedBeforeWriteResultCount
      && summary.readyFixtureCount === summary.readyForMultiHostProjectionCount
      && summary.mismatchedFixtureCount === 0, {
      actual: {
        denialFixtureCount: summary.denialFixtureCount,
        deniedBeforeWriteResultCount: summary.deniedBeforeWriteResultCount,
        mismatchedFixtureCount: summary.mismatchedFixtureCount,
        readyFixtureCount: summary.readyFixtureCount,
        readyForMultiHostProjectionCount: summary.readyForMultiHostProjectionCount
      }
    }),
    check("HIA_WP42_PROVIDER_TARGET_PROVIDER_BOUNDARY", summary.providerContextOnlyDenied === true
      && summary.providerDirectEditDenied === true
      && summary.providerApplyTriggerDenied === true
      && summary.providerExecutableSuccessDenied === true
      && summary.providerNetworkClaimDenied === true, {
      actual: {
        providerApplyTriggerDenied: summary.providerApplyTriggerDenied,
        providerContextOnlyDenied: summary.providerContextOnlyDenied,
        providerDirectEditDenied: summary.providerDirectEditDenied,
        providerExecutableSuccessDenied: summary.providerExecutableSuccessDenied,
        providerNetworkClaimDenied: summary.providerNetworkClaimDenied
      }
    }),
    check("HIA_WP42_PROVIDER_TARGET_OWNER_BOUNDARY", summary.targetOwnerEvidenceIncompleteDenied === true
      && summary.targetOwnerExecutionClaimDenied === true
      && summary.targetOwnerBranchPrSandboxClaimDenied === true
      && summary.targetOwnerCommandExecutionClaimDenied === true
      && summary.targetOwnerReferenceOnlyViolationDenied === true, {
      actual: {
        targetOwnerBranchPrSandboxClaimDenied: summary.targetOwnerBranchPrSandboxClaimDenied,
        targetOwnerCommandExecutionClaimDenied: summary.targetOwnerCommandExecutionClaimDenied,
        targetOwnerEvidenceIncompleteDenied: summary.targetOwnerEvidenceIncompleteDenied,
        targetOwnerExecutionClaimDenied: summary.targetOwnerExecutionClaimDenied,
        targetOwnerReferenceOnlyViolationDenied: summary.targetOwnerReferenceOnlyViolationDenied
      }
    }),
    check("HIA_WP42_PROVIDER_TARGET_NO_EXECUTION_OR_WRITE", summary.providerResultProducedCount === 0
      && summary.externalNetworkCallExecutedCount === 0
      && summary.targetOwnerExecutionClaimedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.targetSandboxCreatedByHiaCount === 0
      && summary.targetBranchCreatedByHiaCount === 0
      && summary.pullRequestOpenedByHiaCount === 0
      && summary.writeAuthorityGrantedCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecutedCount: summary.externalNetworkCallExecutedCount,
        providerResultProducedCount: summary.providerResultProducedCount,
        pullRequestOpenedByHiaCount: summary.pullRequestOpenedByHiaCount,
        targetBranchCreatedByHiaCount: summary.targetBranchCreatedByHiaCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: summary.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetSandboxCreatedByHiaCount: summary.targetSandboxCreatedByHiaCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        writeAuthorityGrantedCount: summary.writeAuthorityGrantedCount
      }
    }),
    check("HIA_WP42_PROVIDER_TARGET_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false
      && summary.sourceReferenceIncludedCount === 0
      && summary.documentContentIncludedInEvidenceCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        documentContentIncludedInEvidenceCount: summary.documentContentIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP42_PROVIDER_TARGET_NEXT_STAGE_READY", nextStageInputs.some((item) => item.phase === "W-P42.6")
      && summary.readyForMultiHostContractProjection === true, {
      actual: {
        nextStages: nextStageInputs.map((item) => item.phase),
        readyForMultiHostContractProjection: summary.readyForMultiHostContractProjection
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp42-provider-review-target-owner-boundary-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-multi-host-contract-projection" : "blocked",
    sourceEvidence: {
      rollbackAuditHardening: normalizePath(rollbackAuditHardeningPath),
      providerReviewLinkage: normalizePath(providerReviewLinkagePath),
      providerReviewHandoff: normalizePath(providerReviewHandoffPath),
      targetOwnerDryRun: normalizePath(targetOwnerDryRunPath)
    },
    boundaryContract: {
      contract: "hia-checked-apply-provider-review-target-owner-boundary",
      contractVersion: "0.1.0-draft",
      providerPolicy: "review-context-only-never-edit-owner",
      targetOwnerPolicy: "target-owner-evidence-reference-only-not-execution-claim",
      readyDisposition: "ready-for-multi-host-contract-projection",
      providerOutputMayTriggerApply: false,
      targetOwnerEvidenceMayAuthorizeHiaMutation: false,
      writeAuthorityGrantedByThisContract: false,
      sourcesContentPolicy: "none"
    },
    controls,
    fixtureMatrix: fixtures.map(toPublicFixture),
    checkerResults,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      boundarySummary: normalizePath(boundarySummaryPath)
    },
    manualChecks: [
      "Confirm future provider success shapes remain review-only and cannot bypass host final confirmation.",
      "Confirm target-owner evidence completeness does not imply HIA has run target commands or mutated target repositories.",
      "Confirm W-P42.6 projects this boundary to VS Code, DevTools and Visual Studio without adding host write authority.",
      "Confirm real provider/network and target-owner execution remain separately gated outside W-P42.5."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P42 provider target-owner boundary evidence");
  assert.equal(hardFailures.length, 0, `W-P42 provider target-owner boundary has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(boundarySummaryPath, renderBoundarySummary(evidence), "utf8");
  console.log(`W-P42 provider/target-owner boundary evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P42 provider/target-owner boundary summary prepared at ${normalizePath(boundarySummaryPath)}`);
}

async function readInputs() {
  return {
    rollbackAuditHardening: await readJson(rollbackAuditHardeningPath),
    providerReviewLinkage: await readJson(providerReviewLinkagePath),
    providerReviewHandoff: await readJson(providerReviewHandoffPath),
    targetOwnerDryRun: await readJson(targetOwnerDryRunPath)
  };
}

function createBoundaryControls() {
  return [
    control("provider-review-context-only", "provider-review-denial"),
    control("provider-direct-edit-output-denied", "provider-review-denial"),
    control("provider-apply-trigger-denied", "provider-review-denial"),
    control("provider-executable-success-denied", "provider-review-denial"),
    control("provider-network-execution-claim-denied", "provider-review-denial"),
    control("target-owner-evidence-completeness-required", "target-owner-evidence-context"),
    control("target-owner-execution-claim-denied", "target-owner-evidence-context"),
    control("target-owner-branch-pr-sandbox-claim-denied", "target-owner-evidence-context"),
    control("target-owner-command-execution-claim-denied", "target-owner-evidence-context"),
    control("target-owner-evidence-reference-only", "target-owner-evidence-context")
  ];
}

function control(id, requiredGateId) {
  return {
    id,
    requiredGateId,
    status: "required-before-write"
  };
}

function createFixtures(controls) {
  const denialFixtures = controls.map((controlItem) => {
    const fixture = createReadyFixture(`fixture-${controlItem.id}`);
    mutateForControlFailure(fixture.transaction, controlItem.id);
    return {
      id: fixture.id,
      expectedDisposition: "deny-before-write",
      expectedControlId: controlItem.id,
      transaction: fixture.transaction
    };
  });
  return [
    ...denialFixtures,
    {
      id: "fixture-provider-target-boundary-complete-review",
      expectedDisposition: "ready-for-multi-host-contract-projection",
      expectedControlId: "all-boundaries-passed",
      transaction: createReadyFixture("fixture-provider-target-boundary-complete-review").transaction
    }
  ];
}

function createReadyFixture(id) {
  return {
    id,
    transaction: {
      transactionId: id,
      providerReview: {
        status: "review-context-only",
        resultShape: "blocked-or-future-shape-review-only",
        directEditorPayloadIncluded: false,
        workspaceEditPayloadIncluded: false,
        applyTriggerIncluded: false,
        providerSuccessMarkedExecutable: false,
        externalNetworkExecuted: false,
        credentialValueIncluded: false,
        sourceBodyIncluded: false
      },
      targetOwnerEvidence: {
        status: "complete",
        contextReferenceOnly: true,
        hiaExecutionClaimed: false,
        targetCommandsExecutedByHia: false,
        sandboxCreatedByHia: false,
        branchCreatedByHia: false,
        pullRequestOpenedByHia: false,
        pushPerformedByHia: false,
        targetRepositoryMutationClaimed: false,
        sourceBodyIncluded: false
      },
      authority: {
        writeAuthorityGranted: false,
        workspaceWriteAllowed: false,
        targetRepositoryMutationAllowed: false,
        checkedApplyTriggered: false,
        directApplyAllowed: false
      },
      privacy: {
        sourcesContentPolicy: "none",
        sourceBodyIncluded: false,
        sourceReferenceIncluded: false,
        credentialValueIncluded: false,
        digestValueIncluded: false,
        absolutePathIncluded: false,
        directEditorObjectIncluded: false
      }
    }
  };
}

function mutateForControlFailure(transaction, controlId) {
  switch (controlId) {
    case "provider-review-context-only":
      transaction.providerReview.status = "executable-output";
      break;
    case "provider-direct-edit-output-denied":
      transaction.providerReview.directEditorPayloadIncluded = true;
      break;
    case "provider-apply-trigger-denied":
      transaction.providerReview.applyTriggerIncluded = true;
      break;
    case "provider-executable-success-denied":
      transaction.providerReview.providerSuccessMarkedExecutable = true;
      break;
    case "provider-network-execution-claim-denied":
      transaction.providerReview.externalNetworkExecuted = true;
      break;
    case "target-owner-evidence-completeness-required":
      transaction.targetOwnerEvidence.status = "incomplete";
      break;
    case "target-owner-execution-claim-denied":
      transaction.targetOwnerEvidence.hiaExecutionClaimed = true;
      break;
    case "target-owner-branch-pr-sandbox-claim-denied":
      transaction.targetOwnerEvidence.sandboxCreatedByHia = true;
      transaction.targetOwnerEvidence.branchCreatedByHia = true;
      transaction.targetOwnerEvidence.pullRequestOpenedByHia = true;
      break;
    case "target-owner-command-execution-claim-denied":
      transaction.targetOwnerEvidence.targetCommandsExecutedByHia = true;
      break;
    case "target-owner-evidence-reference-only":
      transaction.targetOwnerEvidence.contextReferenceOnly = false;
      transaction.targetOwnerEvidence.sourceBodyIncluded = true;
      break;
    default:
      throw new Error(`Unknown W-P42.5 control fixture: ${controlId}`);
  }
}

function runBoundaryChecker(fixture, controls) {
  const failure = detectBoundaryFailure(fixture.transaction);
  const controlItem = controls.find((item) => item.id === failure);
  const denied = Boolean(controlItem);
  const actualControlId = denied ? failure : "all-boundaries-passed";
  const result = {
    fixtureId: fixture.id,
    expectedControlId: fixture.expectedControlId,
    actualControlId,
    expectedDisposition: fixture.expectedDisposition,
    actualDisposition: denied ? "deny-before-write" : "ready-for-multi-host-contract-projection",
    status: fixture.expectedControlId === actualControlId ? "pass" : "fail",
    requiredGateId: denied ? controlItem.requiredGateId : null,
    deniedBeforeWrite: denied,
    readyForMultiHostContractProjection: !denied,
    providerResultProduced: false,
    externalNetworkCallExecuted: false,
    targetOwnerExecutionClaimed: false,
    targetCommandsExecutedByHia: false,
    targetSandboxCreatedByHia: false,
    targetBranchCreatedByHia: false,
    pullRequestOpenedByHia: false,
    writeAuthorityGranted: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    checkedApplyTriggered: false,
    directApplyAllowed: false,
    directEditObjectProduced: false,
    sourceBodyIncludedInEvidence: false,
    sourceReferenceIncluded: false,
    documentContentIncludedInEvidence: false,
    digestValueIncludedInEvidence: false,
    credentialValueIncluded: false,
    pathExposure: false
  };
  assert.equal(result.status, "pass", `Fixture ${fixture.id} expected ${fixture.expectedControlId} but got ${actualControlId}.`);
  return result;
}

function detectBoundaryFailure(transaction) {
  if (transaction.providerReview.status !== "review-context-only") {
    return "provider-review-context-only";
  }
  if (transaction.providerReview.directEditorPayloadIncluded || transaction.providerReview.workspaceEditPayloadIncluded) {
    return "provider-direct-edit-output-denied";
  }
  if (transaction.providerReview.applyTriggerIncluded) {
    return "provider-apply-trigger-denied";
  }
  if (transaction.providerReview.providerSuccessMarkedExecutable) {
    return "provider-executable-success-denied";
  }
  if (transaction.providerReview.externalNetworkExecuted) {
    return "provider-network-execution-claim-denied";
  }
  if (transaction.targetOwnerEvidence.status !== "complete") {
    return "target-owner-evidence-completeness-required";
  }
  if (transaction.targetOwnerEvidence.hiaExecutionClaimed || transaction.targetOwnerEvidence.targetRepositoryMutationClaimed) {
    return "target-owner-execution-claim-denied";
  }
  if (transaction.targetOwnerEvidence.sandboxCreatedByHia
    || transaction.targetOwnerEvidence.branchCreatedByHia
    || transaction.targetOwnerEvidence.pullRequestOpenedByHia
    || transaction.targetOwnerEvidence.pushPerformedByHia) {
    return "target-owner-branch-pr-sandbox-claim-denied";
  }
  if (transaction.targetOwnerEvidence.targetCommandsExecutedByHia) {
    return "target-owner-command-execution-claim-denied";
  }
  if (transaction.targetOwnerEvidence.contextReferenceOnly !== true
    || transaction.targetOwnerEvidence.sourceBodyIncluded
    || transaction.privacy.sourceBodyIncluded
    || transaction.privacy.sourceReferenceIncluded
    || transaction.privacy.credentialValueIncluded
    || transaction.privacy.digestValueIncluded
    || transaction.privacy.absolutePathIncluded
    || transaction.privacy.directEditorObjectIncluded
    || transaction.privacy.sourcesContentPolicy !== "none") {
    return "target-owner-evidence-reference-only";
  }
  return null;
}

function toPublicFixture(fixture) {
  return {
    id: fixture.id,
    expectedControlId: fixture.expectedControlId,
    expectedDisposition: fixture.expectedDisposition,
    providerOutputSerializedAsEdit: false,
    providerMayTriggerApply: false,
    targetOwnerExecutionClaimAccepted: false,
    sourceBodyIncluded: false,
    credentialValueIncluded: false,
    digestValueIncluded: false,
    localAbsolutePathIncluded: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P42.6",
      topic: "multi-host-contract-projection",
      status: "ready-input",
      reason: "Provider review and target-owner evidence boundaries are now deterministic context-only fixtures."
    },
    {
      phase: "W-P42.7",
      topic: "closeout-and-wp43-inputs",
      status: "planned-input",
      reason: "W-P42 closeout can summarize checked apply hardening after multi-host projection."
    },
    {
      phase: "W-P43",
      topic: "host-owned-apply-ux-provider-review-linkage",
      status: "planned-input",
      reason: "Future host UX can display provider/target-owner boundary outcomes without granting write authority."
    }
  ];
}

function summarize({ checkerResults, controls, fixtures, inputs, nextStageInputs }) {
  const summaries = [
    inputs.rollbackAuditHardening.summary,
    inputs.providerReviewLinkage.summary,
    inputs.providerReviewHandoff.summary,
    inputs.targetOwnerDryRun.summary
  ];
  const deniedControlIds = new Set(checkerResults.filter((item) => item.deniedBeforeWrite).map((item) => item.actualControlId));
  return {
    rollbackAuditHardeningReady: inputs.rollbackAuditHardening.status === "ready-for-provider-review-target-owner-boundary",
    providerReviewLinkageReady: inputs.providerReviewLinkage.status === "ready-for-wp40-closeout-and-wp41-wp42-inputs",
    providerReviewHandoffReady: inputs.providerReviewHandoff.status === "ready-for-target-owner-dry-run-evidence",
    targetOwnerDryRunReady: inputs.targetOwnerDryRun.status === "ready-for-wp41-closeout-and-wp42-wp43-inputs",
    inputHardFailureCount: summaries.reduce((total, summary) => total + number(summary?.hardFailureCount), 0),
    sourceProviderReviewPayloadItemCount: number(inputs.providerReviewLinkage.summary?.reviewPayloadItemCount),
    sourceProviderHandoffBindingCount: number(inputs.providerReviewHandoff.summary?.handoffBindingCount),
    sourceTargetOwnerReadinessItemCount: number(inputs.targetOwnerDryRun.summary?.readinessMatrixItemCount),
    sourceDryRunScenarioCount: number(inputs.targetOwnerDryRun.summary?.dryRunScenarioCount),
    boundaryControlCount: controls.length,
    requiredBoundaryControlCount: controls.filter((item) => item.status === "required-before-write").length,
    fixtureCount: fixtures.length,
    denialFixtureCount: fixtures.filter((item) => item.expectedDisposition === "deny-before-write").length,
    readyFixtureCount: fixtures.filter((item) => item.expectedDisposition === "ready-for-multi-host-contract-projection").length,
    deniedBeforeWriteResultCount: checkerResults.filter((item) => item.deniedBeforeWrite === true).length,
    readyForMultiHostProjectionCount: checkerResults.filter((item) => item.readyForMultiHostContractProjection === true).length,
    mismatchedFixtureCount: checkerResults.filter((item) => item.status !== "pass").length,
    providerContextOnlyDenied: deniedControlIds.has("provider-review-context-only"),
    providerDirectEditDenied: deniedControlIds.has("provider-direct-edit-output-denied"),
    providerApplyTriggerDenied: deniedControlIds.has("provider-apply-trigger-denied"),
    providerExecutableSuccessDenied: deniedControlIds.has("provider-executable-success-denied"),
    providerNetworkClaimDenied: deniedControlIds.has("provider-network-execution-claim-denied"),
    targetOwnerEvidenceIncompleteDenied: deniedControlIds.has("target-owner-evidence-completeness-required"),
    targetOwnerExecutionClaimDenied: deniedControlIds.has("target-owner-execution-claim-denied"),
    targetOwnerBranchPrSandboxClaimDenied: deniedControlIds.has("target-owner-branch-pr-sandbox-claim-denied"),
    targetOwnerCommandExecutionClaimDenied: deniedControlIds.has("target-owner-command-execution-claim-denied"),
    targetOwnerReferenceOnlyViolationDenied: deniedControlIds.has("target-owner-evidence-reference-only"),
    readyForMultiHostContractProjection: nextStageInputs.some((item) => item.phase === "W-P42.6" && item.status === "ready-input"),
    nextStageInputCount: nextStageInputs.length,
    providerResultProducedCount: checkerResults.filter((item) => item.providerResultProduced === true).length,
    externalNetworkCallExecutedCount: checkerResults.filter((item) => item.externalNetworkCallExecuted === true).length,
    targetOwnerExecutionClaimedCount: checkerResults.filter((item) => item.targetOwnerExecutionClaimed === true).length,
    targetCommandExecutedByHiaCount: checkerResults.filter((item) => item.targetCommandsExecutedByHia === true).length,
    targetSandboxCreatedByHiaCount: checkerResults.filter((item) => item.targetSandboxCreatedByHia === true).length,
    targetBranchCreatedByHiaCount: checkerResults.filter((item) => item.targetBranchCreatedByHia === true).length,
    pullRequestOpenedByHiaCount: checkerResults.filter((item) => item.pullRequestOpenedByHia === true).length,
    writeAuthorityGrantedCount: checkerResults.filter((item) => item.writeAuthorityGranted === true).length,
    workspaceWriteAllowedCount: checkerResults.filter((item) => item.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: checkerResults.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    checkedApplyTriggeredCount: checkerResults.filter((item) => item.checkedApplyTriggered === true).length,
    directApplyAllowedCount: checkerResults.filter((item) => item.directApplyAllowed === true).length,
    directEditObjectCount: checkerResults.filter((item) => item.directEditObjectProduced === true).length,
    sourceBodyIncludedInEvidence: checkerResults.some((item) => item.sourceBodyIncludedInEvidence === true),
    sourceReferenceIncludedCount: checkerResults.filter((item) => item.sourceReferenceIncluded === true).length,
    documentContentIncludedInEvidenceCount: checkerResults.filter((item) => item.documentContentIncludedInEvidence === true).length,
    digestValueIncludedInEvidenceCount: checkerResults.filter((item) => item.digestValueIncludedInEvidence === true).length,
    credentialValueIncludedCount: checkerResults.filter((item) => item.credentialValueIncluded === true).length,
    forbiddenDocumentTextMarkerCount: Math.max(
      maxSummary(summaries, "forbiddenDocumentTextMarkerCount"),
      maxSummary(summaries, "sourceTextIncludedCount")
    ),
    pathExposureCount: checkerResults.filter((item) => item.pathExposure === true).length,
    sourcesContentPolicy: "none"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function number(value) {
  return Number(value ?? 0);
}

function maxSummary(summaries, fieldName) {
  return Math.max(...summaries.map((summary) => number(summary?.[fieldName])));
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function renderBoundarySummary(evidence) {
  const summary = evidence.summary;
  return `# W-P42 Provider Review And Target-Owner Boundary

## Summary

- status: \`${evidence.status}\`
- boundary controls: ${summary.boundaryControlCount}
- fixtures: ${summary.fixtureCount}
- denial fixtures: ${summary.denialFixtureCount}
- ready fixtures: ${summary.readyFixtureCount}
- denied-before-write results: ${summary.deniedBeforeWriteResultCount}
- ready-for-multi-host-projection results: ${summary.readyForMultiHostProjectionCount}
- mismatches: ${summary.mismatchedFixtureCount}
- provider result / network / target execution claims: ${summary.providerResultProducedCount} / ${summary.externalNetworkCallExecutedCount} / ${summary.targetOwnerExecutionClaimedCount}
- write authority / workspace write / target mutation / checked apply trigger / direct edit: ${summary.writeAuthorityGrantedCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount} / ${summary.directEditObjectCount}

## Next Stage

W-P42.6 should project this context-only boundary to VS Code, DevTools and Visual Studio.
`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function assertNoPrivateMarkers(serialized, label) {
  const forbidden = [
    /[A-Za-z]:[\\/]/,
    /(?:^|[\\/])work-zone(?:[\\/]|$)/i,
    /(?:^|[\\/])Users[\\/]/i,
    /"sourcesContent"\s*:/i,
    /sk-[A-Za-z0-9_-]{8,}/,
    /ghp_[A-Za-z0-9_]{8,}/,
    /npm_[A-Za-z0-9_]{8,}/
  ];
  const hit = forbidden.find((pattern) => pattern.test(serialized));
  assert.equal(hit, undefined, `${label} contains a forbidden private marker: ${hit}`);
}
