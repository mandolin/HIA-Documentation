import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp47-file-version-conflict-preflight-pilot-gate");
const evidencePath = path.join(outputRoot, "evidence.json");
const contractPath = path.join(outputRoot, "wp47-file-version-conflict-preflight-contract.md");
const fixtureMatrixPath = path.join(outputRoot, "wp47-file-version-conflict-fixture-matrix.md");
const summaryPath = path.join(outputRoot, "wp47-file-version-conflict-preflight-summary.md");

const inputPaths = {
  wp47TransactionEnvelope: path.join(rootDir, "dist", "wp47-host-owned-pilot-transaction-envelope", "evidence.json"),
  wp37FileReadConflict: path.join(rootDir, "dist", "wp37-file-read-version-conflict", "evidence.json"),
  wp42PreflightDenialChecker: path.join(rootDir, "dist", "wp42-preflight-denial-checker-fixtures", "evidence.json"),
  wp46Closeout: path.join(rootDir, "dist", "wp46-closeout-wp47-wp48-inputs", "evidence.json")
};

await main();

/**
 * 生成 W-P47.3 file version / conflict preflight pilot gate evidence。
 * Generate W-P47.3 file version / conflict preflight pilot gate evidence.
 *
 * 中文：本阶段消费 W-P47.2 host-owned pilot transaction envelope，把文件版本、
 * 过期快照、冲突预检、重复冲突检查、owner final action 和隐私边界转成可复跑
 * deterministic fixtures。它只证明“哪些事务应在写入前被拒绝、哪些事务可进入
 * 后续 rollback/formatter/audit gate”，不启用 checked apply 写入，不调用宿主
 * 编辑 API，也不读取或保存目标源码正文。
 *
 * English: This stage consumes the W-P47.2 host-owned pilot transaction
 * envelope and turns file-version, stale-snapshot, conflict-preflight, repeat
 * conflict-check, owner-final-action, and privacy boundaries into repeatable
 * deterministic fixtures. It only proves which transactions must be denied
 * before write and which may advance to the later rollback/formatter/audit
 * gate. It does not enable checked apply writes, call host editor APIs, or read
 * or persist target source bodies.
 *
 * @returns {Promise<void>} Writes public-safe W-P47.3 preflight evidence.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const preflightContract = createPreflightContract(inputs.wp47TransactionEnvelope);
  const fixtures = createPreflightFixtures(preflightContract);
  const checkerResults = fixtures.map((fixture) => runPilotPreflightChecker(fixture, preflightContract));
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    checkerResults,
    fixtures,
    inputs,
    nextStageInputs,
    preflightContract
  });
  const checks = [
    check("HIA_WP47_PREFLIGHT_INPUTS_READY", summary.inputEvidenceCount === 4
      && summary.readyInputEvidenceCount === 4
      && summary.inputHardFailureCount === 0
      && summary.wp47TransactionEnvelopeReady === true
      && summary.wp37FileReadConflictReady === true
      && summary.wp42PreflightDenialCheckerReady === true
      && summary.wp46MetadataOnlyInputsReady === true, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount,
        wp37FileReadConflictReady: summary.wp37FileReadConflictReady,
        wp42PreflightDenialCheckerReady: summary.wp42PreflightDenialCheckerReady,
        wp46MetadataOnlyInputsReady: summary.wp46MetadataOnlyInputsReady,
        wp47TransactionEnvelopeReady: summary.wp47TransactionEnvelopeReady
      }
    }),
    check("HIA_WP47_PREFLIGHT_CONTRACT_COVERAGE", summary.requiredGateCount >= 10
      && summary.fileVersionGateRequired === true
      && summary.conflictPreflightGateRequired === true
      && summary.repeatConflictCheckGateRequired === true
      && summary.ownerFinalActionGateRequired === true
      && summary.privacyGateRequired === true, {
      actual: {
        conflictPreflightGateRequired: summary.conflictPreflightGateRequired,
        fileVersionGateRequired: summary.fileVersionGateRequired,
        ownerFinalActionGateRequired: summary.ownerFinalActionGateRequired,
        privacyGateRequired: summary.privacyGateRequired,
        repeatConflictCheckGateRequired: summary.repeatConflictCheckGateRequired,
        requiredGateCount: summary.requiredGateCount
      }
    }),
    check("HIA_WP47_PREFLIGHT_FIXTURE_COVERAGE", summary.fixtureCount === summary.denialFixtureCount + summary.readyFixtureCount
      && summary.denialFixtureCount >= 10
      && summary.readyFixtureCount === 1
      && summary.expectedDeniedFixtureCount === summary.actualDeniedFixtureCount
      && summary.mismatchedFixtureCount === 0, {
      actual: {
        actualDeniedFixtureCount: summary.actualDeniedFixtureCount,
        denialFixtureCount: summary.denialFixtureCount,
        expectedDeniedFixtureCount: summary.expectedDeniedFixtureCount,
        fixtureCount: summary.fixtureCount,
        mismatchedFixtureCount: summary.mismatchedFixtureCount,
        readyFixtureCount: summary.readyFixtureCount
      }
    }),
    check("HIA_WP47_PREFLIGHT_DENIES_BEFORE_WRITE", summary.denyBeforeWritePilotResultCount === summary.denialFixtureCount
      && summary.readyForRollbackFormatterAuditPilotGateCount === 1
      && summary.missingSnapshotDeniedCount === 1
      && summary.staleSnapshotDeniedCount === 1
      && summary.conflictDetectedDeniedCount === 1
      && summary.repeatConflictNotBoundDeniedCount === 1, {
      actual: {
        conflictDetectedDeniedCount: summary.conflictDetectedDeniedCount,
        denyBeforeWritePilotResultCount: summary.denyBeforeWritePilotResultCount,
        missingSnapshotDeniedCount: summary.missingSnapshotDeniedCount,
        readyForRollbackFormatterAuditPilotGateCount: summary.readyForRollbackFormatterAuditPilotGateCount,
        repeatConflictNotBoundDeniedCount: summary.repeatConflictNotBoundDeniedCount,
        staleSnapshotDeniedCount: summary.staleSnapshotDeniedCount
      }
    }),
    check("HIA_WP47_PREFLIGHT_NO_WRITE_AUTHORITY", summary.checkedApplyWriteEnabled === false
      && summary.pilotWriteAuthorized === false
      && summary.writeAuthorityGrantedCount === 0
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectProducedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabled: summary.checkedApplyWriteEnabled,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectProducedCount: summary.directEditObjectProducedCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        pilotWriteAuthorized: summary.pilotWriteAuthorized,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        writeAuthorityGrantedCount: summary.writeAuthorityGrantedCount
      }
    }),
    check("HIA_WP47_PREFLIGHT_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidenceCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceBodyIncludedInEvidenceCount: summary.sourceBodyIncludedInEvidenceCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP47_PREFLIGHT_NEXT_STAGE_READY", summary.readyForWp47RollbackFormatterAuditPilotGate === true
      && summary.nextStage === "W-P47.4 Rollback Formatter Audit Pilot Gate", {
      actual: {
        nextStage: summary.nextStage,
        readyForWp47RollbackFormatterAuditPilotGate: summary.readyForWp47RollbackFormatterAuditPilotGate
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P47.3 file version/conflict preflight has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp47-file-version-conflict-preflight-pilot-gate",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp47-rollback-formatter-audit-pilot-gate",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    preflightPolicy: {
      phase: "W-P47.3",
      cycleGroupId: "C-HIA-P2",
      policy: "host-owned-file-version-conflict-preflight-no-write-authority",
      applyAuthorityOwner: "host",
      evaluatedScope: "metadata-only-deterministic-fixtures",
      checkedApplyWriteEnabledByThisStage: false,
      pilotWriteAuthorizedByThisStage: false,
      targetRepositoryMutationAllowedByThisStage: false,
      hostEditorApiAllowedByThisStage: false,
      sourceBodyAllowedByThisStage: false,
      sourcesContentPolicy: "none"
    },
    preflightContract,
    fixtureMatrix: fixtures.map(toPublicFixture),
    checkerResults,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      contract: normalizePath(contractPath),
      fixtureMatrix: normalizePath(fixtureMatrixPath),
      summary: normalizePath(summaryPath)
    },
    manualChecks: [
      "Confirm host file-version snapshots are represented as metadata-only references without digest values.",
      "Confirm stale snapshots, conflicts and missing repeat-conflict bindings deny before write.",
      "Confirm the ready fixture only advances to W-P47.4 rollback/formatter/audit and does not grant write authority.",
      "Confirm target owner final action is represented as submitted metadata in fixtures, not as HIA execution."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P47.3 file version/conflict preflight evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(contractPath, renderPreflightContract(evidence), "utf8");
  await writeFile(fixtureMatrixPath, renderFixtureMatrix(evidence), "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    contract: contractPath,
    evidence: evidencePath,
    fixtureMatrix: fixtureMatrixPath,
    summary: summaryPath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P47 file version/conflict preflight pilot evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P47 file version/conflict preflight contract prepared at ${normalizePath(contractPath)}`);
}

async function readInputs(paths) {
  return Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)])
  ));
}

function createPreflightContract(envelopeEvidence) {
  const envelopeGates = new Set((envelopeEvidence.envelopeContract?.requiredGates ?? []).map((item) => item.id));
  const requiredGates = [
    gate("host-owned-apply-authority", ["hostSurface", "hostOwnedAuthority"], "blocked-without-host-owned-authority"),
    gate("target-owner-final-action", ["targetOwnerFinalActionRef"], "blocked-without-owner-final-action"),
    gate("file-version-snapshot", ["fileVersionSnapshotRef"], "blocked-without-host-file-version-snapshot"),
    gate("file-version-current", ["fileVersionSnapshotRef"], "blocked-when-snapshot-is-stale"),
    gate("conflict-preflight", ["conflictPreflightRef"], "blocked-without-conflict-preflight"),
    gate("conflict-clear", ["conflictPreflightRef"], "blocked-when-conflict-detected"),
    gate("repeat-conflict-check-bound", ["repeatConflictCheckRef"], "blocked-without-repeat-conflict-check-binding"),
    gate("metadata-only-inputs", ["metadataOnlyInputRefs"], "blocked-when-non-metadata-input-present"),
    gate("privacy-boundary", ["privacyBoundary", "sourceContentPolicy"], "blocked-when-source-secret-or-path-present"),
    gate("host-surface-ready", ["hostSurface"], "blocked-when-host-surface-not-ready")
  ];
  const inheritedGateIds = requiredGates.filter((item) => envelopeGates.has(item.inheritedEnvelopeGateId)).map((item) => item.inheritedEnvelopeGateId);

  return {
    contract: "hia-wp47-file-version-conflict-preflight-pilot-gate",
    contractVersion: "0.1.0-draft",
    inputEnvelopeContract: envelopeEvidence.contract,
    inheritedGateIds,
    requiredGates,
    dispositions: [
      "deny-before-write-pilot",
      "ready-for-wp47-rollback-formatter-audit-pilot-gate"
    ],
    writeAuthorityGrantedByContract: false,
    hostEditorApiAllowedByContract: false,
    targetRepositoryMutationAllowedByContract: false,
    publicEvidenceDigestValueAllowed: false,
    publicEvidenceSourceBodyAllowed: false,
    sourcesContentPolicy: "none"
  };
}

function gate(id, requiredFields, denialCaseId) {
  return {
    id,
    inheritedEnvelopeGateId: id === "target-owner-final-action" ? "target-owner-final-action-slot" : id,
    requiredFields,
    denialCaseId,
    status: "required-before-write-pilot",
    evaluatedByThisStage: true,
    grantsWriteAuthority: false
  };
}

function createPreflightFixtures(contract) {
  const denialCases = [
    "host-surface-not-ready",
    "owner-final-action-missing",
    "missing-file-version-snapshot",
    "stale-file-version-snapshot",
    "missing-conflict-preflight",
    "conflict-detected",
    "repeat-conflict-check-not-bound",
    "direct-edit-object-present",
    "source-secret-or-path-signal",
    "target-mutation-claim"
  ];
  const fixtures = denialCases.map((caseId) => {
    const transaction = createReadyFixtureTransaction(`fixture-${caseId}`, contract);
    mutateForDenialCase(transaction, caseId);
    return {
      id: `fixture-${caseId}`,
      expectedCaseId: caseId,
      expectedDisposition: "deny-before-write-pilot",
      transaction
    };
  });
  fixtures.push({
    id: "fixture-ready-for-rollback-formatter-audit-pilot-gate",
    expectedCaseId: "ready-for-wp47-rollback-formatter-audit-pilot-gate",
    expectedDisposition: "ready-for-wp47-rollback-formatter-audit-pilot-gate",
    transaction: createReadyFixtureTransaction("fixture-ready-for-rollback-formatter-audit-pilot-gate", contract)
  });
  return fixtures;
}

function createReadyFixtureTransaction(id, contract) {
  return {
    transactionId: id,
    contractVersion: contract.contractVersion,
    hostSurface: {
      id: "host-neutral-fixture",
      status: "surface-ready",
      canDisplayPreflight: true,
      canDisplayOwnerFinalAction: true,
      canDisplayRollbackAuditInputs: true
    },
    hostOwnedAuthority: {
      owner: "host",
      checkedApplyWriteEnabled: false,
      pilotWriteAuthorized: false,
      hostEditorApiAllowed: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      providerOwnedApplyAllowed: false,
      lspServerOwnedApplyAllowed: false
    },
    targetOwnerFinalAction: {
      ref: "target-owner-final-action:fixture",
      status: "submitted-metadata",
      executionClaimedByHia: false,
      targetOwnerActionRequired: true
    },
    metadataOnlyInputs: {
      refs: ["wp46-metadata-only-input:fixture"],
      allInputsMetadataOnly: true,
      providerOutputReviewOnly: true,
      directEditObjectPresent: false
    },
    fileVersionSnapshot: {
      ref: "file-version-snapshot:fixture",
      status: "current",
      versionTokenStatus: "established",
      hostPrivateDigestComputed: true,
      digestValueIncludedInEvidence: false,
      stale: false,
      sourceBodyIncludedInEvidence: false
    },
    conflictPreflight: {
      ref: "conflict-preflight:fixture",
      status: "clear",
      blocking: false,
      checkedByHost: true,
      documentContentIncludedInEvidence: false
    },
    repeatConflictCheck: {
      ref: "repeat-conflict-check:fixture",
      status: "bound-required-before-future-write",
      boundToTransaction: true,
      checkedImmediatelyBeforeWrite: false,
      notExecutedBecauseWriteDisabled: true
    },
    downstreamGateRefs: {
      rollbackRecordRef: null,
      formatterPlanRef: null,
      postApplyValidationPlanRef: null,
      redactedAuditRef: null,
      nextStage: "W-P47.4 Rollback Formatter Audit Pilot Gate"
    },
    privacy: {
      sourcesContentPolicy: "none",
      sourceBodyIncludedInEvidence: false,
      sourceTextIncluded: false,
      requestBodyIncluded: false,
      responseBodyIncluded: false,
      secretValueIncluded: false,
      localAbsolutePathIncluded: false,
      credentialMaterialIncluded: false
    },
    runtime: {
      targetCommandExecuted: false,
      providerNetworkExecuted: false,
      checkedApplyTriggered: false,
      hostEditorApiCalled: false,
      workspaceWritePerformed: false,
      targetRepositoryMutationPerformed: false
    }
  };
}

function mutateForDenialCase(transaction, caseId) {
  switch (caseId) {
    case "host-surface-not-ready":
      transaction.hostSurface.status = "surface-not-ready";
      transaction.hostSurface.canDisplayPreflight = false;
      break;
    case "owner-final-action-missing":
      transaction.targetOwnerFinalAction = null;
      break;
    case "missing-file-version-snapshot":
      transaction.fileVersionSnapshot = null;
      break;
    case "stale-file-version-snapshot":
      transaction.fileVersionSnapshot.status = "stale";
      transaction.fileVersionSnapshot.stale = true;
      break;
    case "missing-conflict-preflight":
      transaction.conflictPreflight = null;
      break;
    case "conflict-detected":
      transaction.conflictPreflight.status = "conflict-detected";
      transaction.conflictPreflight.blocking = true;
      break;
    case "repeat-conflict-check-not-bound":
      transaction.repeatConflictCheck.boundToTransaction = false;
      transaction.repeatConflictCheck.status = "not-bound";
      break;
    case "direct-edit-object-present":
      transaction.metadataOnlyInputs.directEditObjectPresent = true;
      transaction.metadataOnlyInputs.allInputsMetadataOnly = false;
      break;
    case "source-secret-or-path-signal":
      transaction.privacy.sourceBodyIncludedInEvidence = true;
      transaction.privacy.secretValueIncluded = true;
      transaction.privacy.localAbsolutePathIncluded = true;
      break;
    case "target-mutation-claim":
      transaction.hostOwnedAuthority.targetRepositoryMutationAllowed = true;
      transaction.runtime.targetRepositoryMutationPerformed = true;
      break;
    default:
      throw new Error(`Unknown W-P47.3 denial case: ${caseId}.`);
  }
}

function runPilotPreflightChecker(fixture, contract) {
  const actualCaseId = detectPreflightCase(fixture.transaction);
  const denied = actualCaseId !== "ready-for-wp47-rollback-formatter-audit-pilot-gate";
  const gate = contract.requiredGates.find((item) => item.denialCaseId === actualCaseId);
  const result = {
    fixtureId: fixture.id,
    expectedCaseId: fixture.expectedCaseId,
    actualCaseId,
    expectedDisposition: fixture.expectedDisposition,
    actualDisposition: denied ? "deny-before-write-pilot" : "ready-for-wp47-rollback-formatter-audit-pilot-gate",
    status: fixture.expectedCaseId === actualCaseId ? "pass" : "fail",
    deniedBeforeWritePilot: denied,
    readyForRollbackFormatterAuditPilotGate: !denied,
    requiredGateId: gate?.id ?? null,
    requiredFields: gate?.requiredFields ?? [],
    writeAuthorityGranted: false,
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    hostEditorApiCallCount: 0,
    checkedApplyTriggered: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    directApplyAllowed: false,
    directEditObjectProduced: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    sourceBodyIncludedInEvidence: false,
    digestValueIncludedInEvidence: false,
    credentialValueIncluded: false,
    localAbsolutePathIncluded: false
  };
  assert.equal(result.status, "pass", `Fixture ${fixture.id} expected ${fixture.expectedCaseId} but got ${actualCaseId}.`);
  return result;
}

function detectPreflightCase(transaction) {
  if (transaction.hostSurface?.status !== "surface-ready" || transaction.hostSurface?.canDisplayPreflight !== true) {
    return "host-surface-not-ready";
  }
  if (!transaction.targetOwnerFinalAction || transaction.targetOwnerFinalAction.status !== "submitted-metadata") {
    return "owner-final-action-missing";
  }
  if (!transaction.fileVersionSnapshot) {
    return "missing-file-version-snapshot";
  }
  if (transaction.fileVersionSnapshot.status !== "current" || transaction.fileVersionSnapshot.stale === true) {
    return "stale-file-version-snapshot";
  }
  if (!transaction.conflictPreflight || transaction.conflictPreflight.checkedByHost !== true) {
    return "missing-conflict-preflight";
  }
  if (transaction.conflictPreflight.blocking === true || transaction.conflictPreflight.status !== "clear") {
    return "conflict-detected";
  }
  if (!transaction.repeatConflictCheck || transaction.repeatConflictCheck.boundToTransaction !== true) {
    return "repeat-conflict-check-not-bound";
  }
  if (transaction.metadataOnlyInputs?.directEditObjectPresent === true
    || transaction.metadataOnlyInputs?.allInputsMetadataOnly !== true) {
    return "direct-edit-object-present";
  }
  if (transaction.privacy?.sourceBodyIncludedInEvidence === true
    || transaction.privacy?.secretValueIncluded === true
    || transaction.privacy?.localAbsolutePathIncluded === true
    || transaction.privacy?.credentialMaterialIncluded === true) {
    return "source-secret-or-path-signal";
  }
  if (transaction.hostOwnedAuthority?.targetRepositoryMutationAllowed === true
    || transaction.runtime?.targetRepositoryMutationPerformed === true) {
    return "target-mutation-claim";
  }
  return "ready-for-wp47-rollback-formatter-audit-pilot-gate";
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P47.4",
      topic: "rollback-formatter-audit-pilot-gate",
      status: "ready-input",
      requirement: "Consume W-P47.3 preflight results and bind rollback, formatter, post-validation and redacted audit records.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P47.5",
      topic: "host-confirmation-surface-pilot-packet",
      status: "planned-input",
      requirement: "Project preflight plus rollback/audit state into host confirmation surfaces after W-P47.4.",
      writeAuthorityGranted: false
    },
    {
      phase: "W-P47.6",
      topic: "target-owner-pilot-dry-run-report-intake",
      status: "planned-input",
      requirement: "Accept target-owner pilot dry-run report metadata without HIA target mutation.",
      writeAuthorityGranted: false
    }
  ];
}

function summarize({ checkerResults, fixtures, inputs, nextStageInputs, preflightContract }) {
  const inputEntries = Object.entries(inputs);
  const serializedPublicSurface = JSON.stringify({
    checkerResults,
    fixtures: fixtures.map(toPublicFixture),
    nextStageInputs,
    preflightContract
  });
  const denialFixtureCount = fixtures.filter((item) => item.expectedDisposition === "deny-before-write-pilot").length;
  const readyFixtureCount = fixtures.filter((item) => item.expectedDisposition === "ready-for-wp47-rollback-formatter-audit-pilot-gate").length;
  return {
    phase: "W-P47.3",
    inputEvidenceCount: inputEntries.length,
    readyInputEvidenceCount: inputEntries.filter(([, evidence]) => isReadyEvidence(evidence)).length,
    inputHardFailureCount: sum(inputEntries.map(([, evidence]) => evidence.summary?.hardFailureCount)),
    wp47TransactionEnvelopeReady: inputs.wp47TransactionEnvelope.status === "ready-for-wp47-file-version-conflict-preflight-pilot-gate",
    wp37FileReadConflictReady: inputs.wp37FileReadConflict.status === "ready-for-rollback-formatter-audit-boundary",
    wp42PreflightDenialCheckerReady: inputs.wp42PreflightDenialChecker.status === "ready-for-rollback-formatter-audit-hardening",
    wp46MetadataOnlyInputsReady: inputs.wp46Closeout.summary?.wp47MetadataOnlyInputCount === inputs.wp46Closeout.summary?.wp47InputCount,
    requiredGateCount: preflightContract.requiredGates.length,
    fileVersionGateRequired: hasGate(preflightContract, "file-version-snapshot") && hasGate(preflightContract, "file-version-current"),
    conflictPreflightGateRequired: hasGate(preflightContract, "conflict-preflight") && hasGate(preflightContract, "conflict-clear"),
    repeatConflictCheckGateRequired: hasGate(preflightContract, "repeat-conflict-check-bound"),
    ownerFinalActionGateRequired: hasGate(preflightContract, "target-owner-final-action"),
    privacyGateRequired: hasGate(preflightContract, "privacy-boundary"),
    fixtureCount: fixtures.length,
    denialFixtureCount,
    readyFixtureCount,
    expectedDeniedFixtureCount: denialFixtureCount,
    actualDeniedFixtureCount: checkerResults.filter((item) => item.deniedBeforeWritePilot === true).length,
    mismatchedFixtureCount: checkerResults.filter((item) => item.status !== "pass").length,
    denyBeforeWritePilotResultCount: checkerResults.filter((item) => item.actualDisposition === "deny-before-write-pilot").length,
    readyForRollbackFormatterAuditPilotGateCount: checkerResults.filter((item) => item.readyForRollbackFormatterAuditPilotGate === true).length,
    missingSnapshotDeniedCount: countCase(checkerResults, "missing-file-version-snapshot"),
    staleSnapshotDeniedCount: countCase(checkerResults, "stale-file-version-snapshot"),
    conflictDetectedDeniedCount: countCase(checkerResults, "conflict-detected"),
    repeatConflictNotBoundDeniedCount: countCase(checkerResults, "repeat-conflict-check-not-bound"),
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    writeAuthorityGrantedCount: checkerResults.filter((item) => item.writeAuthorityGranted === true).length,
    hostEditorApiCallCount: sum(checkerResults.map((item) => item.hostEditorApiCallCount)),
    checkedApplyTriggeredCount: checkerResults.filter((item) => item.checkedApplyTriggered === true).length,
    workspaceWriteAllowedCount: checkerResults.filter((item) => item.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: checkerResults.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    directApplyAllowedCount: checkerResults.filter((item) => item.directApplyAllowed === true).length,
    directEditObjectProducedCount: checkerResults.filter((item) => item.directEditObjectProduced === true).length,
    providerOwnedApplyCount: checkerResults.filter((item) => item.providerOwnedApplyAllowed === true).length,
    lspServerOwnedApplyCount: checkerResults.filter((item) => item.lspServerOwnedApplyAllowed === true).length,
    sourceBodyIncludedInEvidenceCount: checkerResults.filter((item) => item.sourceBodyIncludedInEvidence === true).length,
    sourceTextIncludedCount: 0,
    requestBodyIncludedCount: 0,
    responseBodyIncludedCount: 0,
    secretValueIncludedCount: 0,
    digestValueIncludedInEvidenceCount: checkerResults.filter((item) => item.digestValueIncludedInEvidence === true).length,
    localAbsolutePathDetectedCount: countPathExposure(serializedPublicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(serializedPublicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(serializedPublicSurface) ? 1 : 0,
    sourcesContentPolicy: "none",
    nextStageInputCount: nextStageInputs.length,
    readyForWp47RollbackFormatterAuditPilotGate: true,
    nextStage: "W-P47.4 Rollback Formatter Audit Pilot Gate",
    hardFailureCount: 0
  };
}

function toPublicFixture(fixture) {
  return {
    id: fixture.id,
    expectedCaseId: fixture.expectedCaseId,
    expectedDisposition: fixture.expectedDisposition,
    signalSummary: {
      hostSurfaceStatus: fixture.transaction.hostSurface?.status ?? "missing",
      ownerFinalActionStatus: fixture.transaction.targetOwnerFinalAction?.status ?? "missing",
      fileVersionSnapshotStatus: fixture.transaction.fileVersionSnapshot?.status ?? "missing",
      conflictPreflightStatus: fixture.transaction.conflictPreflight?.status ?? "missing",
      repeatConflictCheckStatus: fixture.transaction.repeatConflictCheck?.status ?? "missing",
      metadataOnlyInputs: fixture.transaction.metadataOnlyInputs?.allInputsMetadataOnly === true,
      sourceOrSecretOrPathSignal: fixture.transaction.privacy?.sourceBodyIncludedInEvidence === true
        || fixture.transaction.privacy?.secretValueIncluded === true
        || fixture.transaction.privacy?.localAbsolutePathIncluded === true,
      targetMutationClaim: fixture.transaction.hostOwnedAuthority?.targetRepositoryMutationAllowed === true
        || fixture.transaction.runtime?.targetRepositoryMutationPerformed === true
    },
    publicEvidenceContainsSourceBody: false,
    publicEvidenceContainsDigestValue: false,
    writeAuthorityGranted: false
  };
}

function renderPreflightContract(evidence) {
  const gateRows = evidence.preflightContract.requiredGates
    .map((item) => `| \`${item.id}\` | ${item.requiredFields.map((fieldName) => `\`${fieldName}\``).join(", ")} | \`${item.denialCaseId}\` |`)
    .join("\n");

  return `# W-P47.3 File Version / Conflict Preflight Contract

## 中文摘要

W-P47.3 将 W-P47.2 的 host-owned pilot transaction envelope 细化为 file version / conflict preflight gate。它验证 host-owned snapshot、stale snapshot、conflict、repeat conflict binding、owner final action 与 privacy signal 的拒绝路径，但不启用 checked apply 写入。

## Required Gates

| Gate | Required Fields | Denial Case |
| --- | --- | --- |
${gateRows}

## Boundary

- checked apply write: disabled
- host editor API: disabled
- workspace write: disabled
- target repository mutation: disabled
- source body and digest value in public evidence: disabled
`;
}

function renderFixtureMatrix(evidence) {
  const rows = evidence.checkerResults
    .map((item) => `| \`${item.fixtureId}\` | \`${item.actualCaseId}\` | \`${item.actualDisposition}\` | ${item.readyForRollbackFormatterAuditPilotGate ? "yes" : "no"} | ${item.writeAuthorityGranted ? "yes" : "no"} |`)
    .join("\n");

  return `# W-P47.3 File Version / Conflict Fixture Matrix

## 中文摘要

fixture matrix 覆盖写入前拒绝路径和一个进入 W-P47.4 的 ready 输入。ready 只表示可继续绑定 rollback / formatter / audit，不表示可写入。

| Fixture | Case | Disposition | Ready For W-P47.4 | Grants Write |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function renderSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P47.3 File Version / Conflict Preflight Summary

## 中文摘要

- status: \`${evidence.status}\`
- fixtures: ${summary.fixtureCount}
- denial fixtures: ${summary.denialFixtureCount}
- ready fixtures: ${summary.readyFixtureCount}
- denied before write pilot: ${summary.denyBeforeWritePilotResultCount}
- ready for W-P47.4: ${summary.readyForRollbackFormatterAuditPilotGateCount}
- checked apply write enabled: ${summary.checkedApplyWriteEnabled}
- workspace write / target mutation / host editor API: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.hostEditorApiCallCount}
- source body / digest value / secret value in evidence: ${summary.sourceBodyIncludedInEvidenceCount} / ${summary.digestValueIncludedInEvidenceCount} / ${summary.secretValueIncludedCount}

## Next

W-P47.4 should consume this evidence and bind rollback record, formatter plan, post-apply validation plan and redacted audit gates.
`;
}

function hasGate(contract, id) {
  return contract.requiredGates.some((item) => item.id === id && item.status === "required-before-write-pilot");
}

function countCase(results, caseId) {
  return results.filter((item) => item.actualCaseId === caseId && item.deniedBeforeWritePilot === true).length;
}

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/") || ".";
}

function number(value) {
  return Number(value ?? 0);
}

function sum(values) {
  return values.reduce((total, value) => total + number(value), 0);
}

function countPathExposure(serialized) {
  return /(^|[^A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u.test(serialized) ? 1 : 0;
}

function countCredentialMarkers(serialized) {
  return /sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{8,}|npm_[A-Za-z0-9_]{8,}/u.test(serialized) ? 1 : 0;
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /(^|[^A-Za-z])[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//iu, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])work-zone(?:[\\/]|$)/iu, `${label} must not expose private WorkZone paths.`);
  assert.doesNotMatch(serialized, /(?:^|[\\/])Users[\\/]/iu, `${label} must not expose user profile paths.`);
  assert.doesNotMatch(serialized, /"sourcesContent"\s*:/iu, `${label} must not embed sourcesContent.`);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{8,}/u, `${label} must not expose API keys.`);
  assert.doesNotMatch(serialized, /ghp_[A-Za-z0-9_]{8,}/u, `${label} must not expose GitHub tokens.`);
  assert.doesNotMatch(serialized, /npm_[A-Za-z0-9_]{8,}/u, `${label} must not expose npm tokens.`);
}
