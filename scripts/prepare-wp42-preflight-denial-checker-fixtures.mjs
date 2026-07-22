import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp42-preflight-denial-checker-fixtures");
const evidencePath = path.join(outputRoot, "evidence.json");
const checkerSummaryPath = path.join(outputRoot, "preflight-denial-checker-summary.md");
const transactionContractPath = path.join(rootDir, "dist", "wp42-checked-apply-transaction-hardening-contract", "evidence.json");

await main();

/**
 * 准备 W-P42.3 checked apply preflight denial checker fixture evidence。
 * Prepare W-P42.3 checked apply preflight denial checker fixture evidence.
 *
 * This stage consumes the hardened transaction contract from W-P42.2 and
 * converts each denial binding into a deterministic checker fixture/result
 * pair. It validates denial-before-write behavior only; it does not grant
 * write authority, call host editor APIs, execute providers or mutate targets.
 *
 * 中文：本阶段消费 W-P42.2 的 hardened transaction contract，并把每个 denial
 * binding 转成可复跑的 checker fixture/result。它只验证写入前拒绝行为，不授予写入权，
 * 不调用宿主编辑 API，不执行 provider，也不修改目标项目。
 *
 * @returns {Promise<void>} Writes public-safe W-P42.3 checker fixture evidence and summary.
 */
async function main() {
  const transactionEvidence = await readJson(transactionContractPath);
  const contract = transactionEvidence.hardenedTransactionContract;
  const denialBindings = transactionEvidence.denialBindings;
  const fixtures = createFixtures(contract, denialBindings);
  const checkerResults = fixtures.map((fixture) => runPreflightDenialChecker(fixture, denialBindings));
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    checkerResults,
    contract,
    denialBindings,
    fixtures,
    nextStageInputs,
    transactionEvidence
  });
  const checks = [
    check("HIA_WP42_DENIAL_CHECKER_INPUT_READY", summary.contractInputReady === true
      && summary.contractHardFailureCount === 0
      && summary.denialBindingCount >= 11, {
      actual: {
        contractHardFailureCount: summary.contractHardFailureCount,
        contractInputReady: summary.contractInputReady,
        denialBindingCount: summary.denialBindingCount
      }
    }),
    check("HIA_WP42_DENIAL_CHECKER_FIXTURE_COVERAGE", summary.fixtureCount === summary.denialBindingCount + 1
      && summary.denialFixtureCount === summary.denialBindingCount
      && summary.readyFixtureCount === 1
      && summary.mismatchedFixtureCount === 0, {
      actual: {
        denialBindingCount: summary.denialBindingCount,
        denialFixtureCount: summary.denialFixtureCount,
        fixtureCount: summary.fixtureCount,
        mismatchedFixtureCount: summary.mismatchedFixtureCount,
        readyFixtureCount: summary.readyFixtureCount
      }
    }),
    check("HIA_WP42_DENIAL_CHECKER_DENIES_BEFORE_WRITE", summary.expectedDeniedFixtureCount === summary.actualDeniedFixtureCount
      && summary.denyBeforeWriteResultCount === summary.expectedDeniedFixtureCount
      && summary.readyForFutureHostApplyReviewCount === 1, {
      actual: {
        actualDeniedFixtureCount: summary.actualDeniedFixtureCount,
        denyBeforeWriteResultCount: summary.denyBeforeWriteResultCount,
        expectedDeniedFixtureCount: summary.expectedDeniedFixtureCount,
        readyForFutureHostApplyReviewCount: summary.readyForFutureHostApplyReviewCount
      }
    }),
    check("HIA_WP42_DENIAL_CHECKER_NO_WRITE_AUTHORITY", summary.writeAuthorityGrantedCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        writeAuthorityGrantedCount: summary.writeAuthorityGrantedCount
      }
    }),
    check("HIA_WP42_DENIAL_CHECKER_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false
      && summary.documentContentIncludedInEvidenceCount === 0
      && summary.digestValueIncludedInEvidenceCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedInEvidenceCount: summary.digestValueIncludedInEvidenceCount,
        documentContentIncludedInEvidenceCount: summary.documentContentIncludedInEvidenceCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP42_DENIAL_CHECKER_NEXT_STAGE_READY", nextStageInputs.some((item) => item.phase === "W-P42.4")
      && summary.readyForRollbackFormatterAuditHardening === true, {
      actual: {
        nextStages: nextStageInputs.map((item) => item.phase),
        readyForRollbackFormatterAuditHardening: summary.readyForRollbackFormatterAuditHardening
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp42-preflight-denial-checker-fixtures-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-rollback-formatter-audit-hardening" : "blocked",
    sourceEvidence: {
      transactionHardeningContract: normalizePath(transactionContractPath)
    },
    checkerContract: {
      contract: "hia-checked-apply-preflight-denial-checker",
      contractVersion: "0.1.0-draft",
      owner: "host-owned-preflight",
      inputContractRef: transactionEvidence.contract,
      inputContractVersion: transactionEvidence.contractVersion,
      dispositionPolicy: "deny-before-write-until-all-required-gates-pass",
      readyDisposition: "ready-for-future-host-apply-review",
      writeAuthorityGrantedByThisChecker: false,
      workspaceWriteAllowedByThisChecker: false,
      targetRepositoryMutationAllowedByThisChecker: false,
      providerOwnedApplyAllowedByThisChecker: false,
      lspServerOwnedApplyAllowedByThisChecker: false
    },
    fixtureMatrix: fixtures.map(toPublicFixture),
    checkerResults,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      checkerSummary: normalizePath(checkerSummaryPath)
    },
    manualChecks: [
      "Confirm future host UX consumes these denial fixtures before exposing any apply-ready affordance.",
      "Confirm the ready fixture only means future host review readiness and does not grant write authority.",
      "Confirm provider review unsafe signals are represented as booleans, not direct edit objects or editor payloads.",
      "Confirm rollback, formatter and audit details are hardened further in W-P42.4 before any real checked apply path is considered."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P42 preflight denial checker evidence");
  assert.equal(hardFailures.length, 0, `W-P42 preflight denial checker has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(checkerSummaryPath, renderCheckerSummary(evidence), "utf8");
  console.log(`W-P42 preflight denial checker evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P42 preflight denial checker summary prepared at ${normalizePath(checkerSummaryPath)}`);
}

function createFixtures(contract, denialBindings) {
  const bindingIds = new Set(denialBindings.map((item) => item.id));
  const fixtures = denialBindings.map((binding) => {
    const fixture = createReadyTransactionFixture(contract, `fixture-${binding.id}`);
    mutateForDenialCase(fixture.transaction, binding.id);
    return {
      id: fixture.id,
      expectedCaseId: binding.id,
      expectedDisposition: "deny-before-write",
      transaction: fixture.transaction
    };
  });
  fixtures.push({
    id: "fixture-ready-future-host-apply-review",
    expectedCaseId: "ready-future-host-apply-review",
    expectedDisposition: "ready-for-future-host-apply-review",
    transaction: createReadyTransactionFixture(contract, "fixture-ready-future-host-apply-review").transaction
  });
  assert.equal(fixtures.filter((item) => bindingIds.has(item.expectedCaseId)).length, denialBindings.length);
  return fixtures;
}

function createReadyTransactionFixture(contract, id) {
  const requiredGateIds = contract.requiredGates.map((item) => item.id);
  return {
    id,
    transaction: {
      transactionId: id,
      contractVersion: contract.contractVersion,
      sourceReviewPayloadRef: {
        ref: "review-payload:fixture",
        providerResultIncludesDirectEditorObject: false,
        providerResultIncludesWorkspaceEditPayload: false
      },
      proposalRefs: ["proposal-ref:fixture"],
      targetOwnerEvidenceRef: {
        ref: "target-owner-evidence:fixture",
        status: "complete",
        executionClaimedByHia: false
      },
      hostSurface: "host-neutral-fixture",
      authority: {
        owner: "host",
        writeAuthorityGranted: false,
        workspaceWriteAllowed: false,
        targetRepositoryMutationAllowed: false,
        providerOwnedApplyAllowed: false,
        lspServerOwnedApplyAllowed: false,
        directEditorObjectAllowed: false
      },
      state: "future-host-apply-ready",
      targetBindings: [
        {
          ref: "target-binding:relative-fixture",
          pathKind: "relative-redacted",
          targetKind: "documentation-comment"
        }
      ],
      semanticOperations: [
        {
          id: "semantic-operation:fixture",
          kind: "replace-doc-comment",
          executableEditorPayload: false
        }
      ],
      fileVersionResults: [
        {
          ref: "file-version:fixture",
          status: "current",
          hostRead: true,
          digestValueIncluded: false
        }
      ],
      conflictResults: [
        {
          ref: "conflict-result:fixture",
          status: "clean",
          repeatCheckRequired: true,
          checkedImmediatelyBeforeApply: true
        }
      ],
      rollbackRecords: [
        {
          ref: "rollback-record:fixture",
          status: "prepared",
          sourceBodyIncluded: false
        }
      ],
      formatterPlan: {
        status: "prepared",
        formatterRequired: true,
        postApplyValidationRequired: true,
        validationPlanStatus: "prepared"
      },
      finalHumanConfirmation: {
        status: "confirmed-after-preflight",
        requiredGateIds
      },
      applyAudit: {
        status: "prepared",
        redactionStatus: "redacted",
        documentContentIncluded: false,
        credentialValueIncluded: false,
        absolutePathIncluded: false
      },
      privacy: {
        sourcesContentPolicy: "none",
        sourceBodyIncluded: false,
        credentialValueIncluded: false,
        digestValueIncluded: false,
        absolutePathIncluded: false,
        directEditorObjectIncluded: false
      },
      denialState: null,
      hostApplyToken: null
    }
  };
}

function mutateForDenialCase(transaction, caseId) {
  switch (caseId) {
    case "provider-direct-edit-object":
      transaction.sourceReviewPayloadRef.providerResultIncludesDirectEditorObject = true;
      transaction.authority.directEditorObjectAllowed = false;
      break;
    case "provider-workspace-edit":
      transaction.sourceReviewPayloadRef.providerResultIncludesWorkspaceEditPayload = true;
      transaction.authority.workspaceWriteAllowed = false;
      break;
    case "missing-final-human-confirmation":
      transaction.finalHumanConfirmation = null;
      break;
    case "missing-host-file-version":
      transaction.fileVersionResults = [];
      break;
    case "stale-file-version":
      transaction.fileVersionResults[0].status = "stale";
      transaction.conflictResults[0].checkedImmediatelyBeforeApply = false;
      break;
    case "conflict-detected":
      transaction.conflictResults[0].status = "conflict";
      break;
    case "missing-rollback-record":
      transaction.rollbackRecords = [];
      break;
    case "formatter-or-validation-plan-missing":
      transaction.formatterPlan.validationPlanStatus = "missing";
      transaction.formatterPlan.postApplyValidationRequired = false;
      break;
    case "audit-record-missing-or-unredacted":
      transaction.applyAudit.redactionStatus = "unredacted";
      break;
    case "target-owner-evidence-incomplete":
      transaction.targetOwnerEvidenceRef.status = "incomplete";
      break;
    case "source-secret-or-path-exposure":
      transaction.privacy.sourceBodyIncluded = true;
      transaction.privacy.credentialValueIncluded = true;
      transaction.privacy.absolutePathIncluded = true;
      break;
    default:
      throw new Error(`Unknown denial case fixture: ${caseId}`);
  }
}

function runPreflightDenialChecker(fixture, denialBindings) {
  const transaction = fixture.transaction;
  const denialCaseId = detectDenialCase(transaction);
  const binding = denialBindings.find((item) => item.id === denialCaseId);
  const denied = Boolean(binding);
  const ready = !denied;
  const result = {
    fixtureId: fixture.id,
    expectedCaseId: fixture.expectedCaseId,
    actualCaseId: denied ? denialCaseId : "ready-future-host-apply-review",
    expectedDisposition: fixture.expectedDisposition,
    actualDisposition: denied ? "deny-before-write" : "ready-for-future-host-apply-review",
    status: expectedMatchesActual(fixture, denied ? denialCaseId : "ready-future-host-apply-review") ? "pass" : "fail",
    deniedBeforeWrite: denied,
    readyForFutureHostApplyReview: ready,
    denialBindingRef: binding?.id ?? null,
    deniedState: denied ? "blocked-or-denied" : null,
    requiredFields: binding?.requiredFields ?? [],
    requiredGateIds: binding?.requiredGateIds ?? [],
    invariantId: binding?.invariantId ?? null,
    writeAuthorityGranted: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    targetRepositoryWriteAttempted: false,
    checkedApplyTriggered: false,
    directApplyAllowed: false,
    directEditObjectProduced: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    sourceBodyIncludedInEvidence: false,
    documentContentIncludedInEvidence: false,
    digestValueIncludedInEvidence: false,
    credentialValueIncluded: false,
    pathExposure: false
  };
  assert.equal(result.status, "pass", `Fixture ${fixture.id} expected ${fixture.expectedCaseId} but got ${result.actualCaseId}.`);
  return result;
}

function detectDenialCase(transaction) {
  if (transaction.sourceReviewPayloadRef?.providerResultIncludesDirectEditorObject === true) {
    return "provider-direct-edit-object";
  }
  if (transaction.sourceReviewPayloadRef?.providerResultIncludesWorkspaceEditPayload === true) {
    return "provider-workspace-edit";
  }
  if (!transaction.finalHumanConfirmation || transaction.finalHumanConfirmation.status !== "confirmed-after-preflight") {
    return "missing-final-human-confirmation";
  }
  if (!Array.isArray(transaction.fileVersionResults) || transaction.fileVersionResults.length === 0) {
    return "missing-host-file-version";
  }
  if (transaction.fileVersionResults.some((item) => item.status !== "current")) {
    return "stale-file-version";
  }
  if (!Array.isArray(transaction.conflictResults) || transaction.conflictResults.some((item) => item.status !== "clean")) {
    return "conflict-detected";
  }
  if (transaction.conflictResults.some((item) => item.checkedImmediatelyBeforeApply !== true)) {
    return "stale-file-version";
  }
  if (!Array.isArray(transaction.rollbackRecords) || transaction.rollbackRecords.length === 0) {
    return "missing-rollback-record";
  }
  if (!transaction.formatterPlan
    || transaction.formatterPlan.postApplyValidationRequired !== true
    || transaction.formatterPlan.validationPlanStatus !== "prepared") {
    return "formatter-or-validation-plan-missing";
  }
  if (!transaction.applyAudit || transaction.applyAudit.redactionStatus !== "redacted") {
    return "audit-record-missing-or-unredacted";
  }
  if (!transaction.targetOwnerEvidenceRef || transaction.targetOwnerEvidenceRef.status !== "complete") {
    return "target-owner-evidence-incomplete";
  }
  if (transaction.privacy?.sourceBodyIncluded === true
    || transaction.privacy?.credentialValueIncluded === true
    || transaction.privacy?.digestValueIncluded === true
    || transaction.privacy?.absolutePathIncluded === true
    || transaction.privacy?.directEditorObjectIncluded === true
    || transaction.privacy?.sourcesContentPolicy !== "none") {
    return "source-secret-or-path-exposure";
  }
  return null;
}

function expectedMatchesActual(fixture, actualCaseId) {
  return fixture.expectedCaseId === actualCaseId;
}

function toPublicFixture(fixture) {
  return {
    id: fixture.id,
    expectedCaseId: fixture.expectedCaseId,
    expectedDisposition: fixture.expectedDisposition,
    mutationKind: fixture.expectedCaseId === "ready-future-host-apply-review" ? "none" : fixture.expectedCaseId,
    sourceBodyIncluded: false,
    credentialValueIncluded: false,
    localAbsolutePathIncluded: false,
    directEditorObjectSerialized: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false
  };
}

function createNextStageInputs() {
  return [
    {
      phase: "W-P42.4",
      topic: "rollback-formatter-audit-hardening",
      status: "ready-input",
      reason: "The checker fixture matrix now proves rollback, formatter and audit gaps are denied before write."
    },
    {
      phase: "W-P42.5",
      topic: "provider-review-target-owner-boundary",
      status: "planned-input",
      reason: "Provider unsafe signals and target-owner incomplete evidence are now deterministic denial fixtures."
    },
    {
      phase: "W-P42.6",
      topic: "multi-host-contract-projection",
      status: "planned-input",
      reason: "Host shells can later project one neutral preflight result taxonomy without write authority."
    }
  ];
}

function summarize({ checkerResults, contract, denialBindings, fixtures, nextStageInputs, transactionEvidence }) {
  const denialFixtureCount = fixtures.filter((item) => item.expectedDisposition === "deny-before-write").length;
  const readyFixtureCount = fixtures.filter((item) => item.expectedDisposition === "ready-for-future-host-apply-review").length;
  const actualDeniedFixtureCount = checkerResults.filter((item) => item.actualDisposition === "deny-before-write").length;
  const actualReadyFixtureCount = checkerResults.filter((item) => item.actualDisposition === "ready-for-future-host-apply-review").length;
  return {
    contractInputReady: transactionEvidence.status === "ready-for-preflight-denial-checker-fixtures",
    contractHardFailureCount: number(transactionEvidence.summary?.hardFailureCount),
    contractEnvelopeFieldCount: Array.isArray(contract.envelopeFields) ? contract.envelopeFields.length : 0,
    contractRequiredGateCount: Array.isArray(contract.requiredGates) ? contract.requiredGates.length : 0,
    denialBindingCount: denialBindings.length,
    fixtureCount: fixtures.length,
    denialFixtureCount,
    readyFixtureCount,
    expectedDeniedFixtureCount: denialFixtureCount,
    actualDeniedFixtureCount,
    expectedReadyFixtureCount: readyFixtureCount,
    actualReadyFixtureCount,
    mismatchedFixtureCount: checkerResults.filter((item) => item.status !== "pass").length,
    denyBeforeWriteResultCount: checkerResults.filter((item) => item.deniedBeforeWrite === true).length,
    readyForFutureHostApplyReviewCount: checkerResults.filter((item) => item.readyForFutureHostApplyReview === true).length,
    readyForRollbackFormatterAuditHardening: nextStageInputs.some((item) => item.phase === "W-P42.4" && item.status === "ready-input"),
    nextStageInputCount: nextStageInputs.length,
    writeAuthorityGrantedCount: checkerResults.filter((item) => item.writeAuthorityGranted === true).length,
    workspaceWriteAllowedCount: checkerResults.filter((item) => item.workspaceWriteAllowed === true).length,
    targetRepositoryMutationCount: checkerResults.filter((item) => item.targetRepositoryMutationAllowed === true).length,
    targetRepositoryWriteAttemptedCount: checkerResults.filter((item) => item.targetRepositoryWriteAttempted === true).length,
    checkedApplyTriggeredCount: checkerResults.filter((item) => item.checkedApplyTriggered === true).length,
    directApplyAllowedCount: checkerResults.filter((item) => item.directApplyAllowed === true).length,
    directEditObjectCount: checkerResults.filter((item) => item.directEditObjectProduced === true).length,
    providerOwnedApplyCount: checkerResults.filter((item) => item.providerOwnedApplyAllowed === true).length,
    lspServerOwnedApplyCount: checkerResults.filter((item) => item.lspServerOwnedApplyAllowed === true).length,
    sourceBodyIncludedInEvidence: checkerResults.some((item) => item.sourceBodyIncludedInEvidence === true),
    sourcesContentPolicy: "none",
    documentContentIncludedInEvidenceCount: checkerResults.filter((item) => item.documentContentIncludedInEvidence === true).length,
    digestValueIncludedInEvidenceCount: checkerResults.filter((item) => item.digestValueIncludedInEvidence === true).length,
    credentialValueIncludedCount: checkerResults.filter((item) => item.credentialValueIncluded === true).length,
    credentialMaterialMarkerCount: 0,
    forbiddenDocumentTextMarkerCount: 0,
    pathExposureCount: checkerResults.filter((item) => item.pathExposure === true).length
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function number(value) {
  return Number(value ?? 0);
}

function check(code, passed, details = {}) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

function renderCheckerSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P42 Preflight Denial Checker Fixtures

## Summary

- status: \`${evidence.status}\`
- denial bindings: ${summary.denialBindingCount}
- fixtures: ${summary.fixtureCount}
- denial fixtures: ${summary.denialFixtureCount}
- ready fixtures: ${summary.readyFixtureCount}
- deny-before-write results: ${summary.denyBeforeWriteResultCount}
- ready-for-future-host-apply-review results: ${summary.readyForFutureHostApplyReviewCount}
- mismatches: ${summary.mismatchedFixtureCount}
- write authority / workspace write / target mutation / checked apply trigger / direct edit: ${summary.writeAuthorityGrantedCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount} / ${summary.directEditObjectCount}

## Next Stage

W-P42.4 should harden rollback, formatter and redacted audit success/failure details using these denial outcomes.
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
