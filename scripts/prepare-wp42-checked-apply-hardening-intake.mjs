import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp42-checked-apply-hardening-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const summaryPath = path.join(outputRoot, "wp42-hardening-intake-summary.md");
const wp37CloseoutPath = path.join(rootDir, "dist", "wp37-closeout-provider-remote-inputs", "evidence.json");
const wp38CloseoutPath = path.join(rootDir, "dist", "wp38-closeout-next-inputs", "evidence.json");
const wp40CloseoutPath = path.join(rootDir, "dist", "wp40-closeout-wp41-wp42-inputs", "evidence.json");
const wp41CloseoutPath = path.join(rootDir, "dist", "wp41-closeout-wp42-wp43-inputs", "evidence.json");

await main();

/**
 * 准备 W-P42.1 checked apply contract hardening intake evidence。
 * Prepare W-P42.1 checked apply contract hardening intake evidence.
 *
 * This stage consumes checked-apply, writable-sandbox, provider-review and
 * target-owner closeout evidence, then fixes the W-P42 hardening scope before
 * any real checked apply write can be considered.
 *
 * 中文：本阶段消费 checked apply、可写沙箱、provider review 与 target-owner 收口
 * 证据，在考虑任何真实 checked apply 写入前，先固定 W-P42 的合同硬化范围。
 *
 * @returns {Promise<void>} Writes public-safe W-P42.1 intake evidence and a short summary.
 */
async function main() {
  const inputs = await readInputs();
  const hardeningDimensions = createHardeningDimensions();
  const denialCases = createDenialCases();
  const nextStageInputs = createNextStageInputs();
  const summary = summarize({
    denialCases,
    hardeningDimensions,
    inputs,
    nextStageInputs
  });
  const checks = [
    check("HIA_WP42_INTAKE_INPUTS_READY", summary.inputEvidenceCount === 4
      && summary.readyInputEvidenceCount === 4
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP42_INTAKE_NO_WRITE_AUTHORITY", summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.checkedApplyWriteStillDeferred === true, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteStillDeferred: summary.checkedApplyWriteStillDeferred,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP42_INTAKE_HARDENING_SCOPE_DECLARED", summary.hardeningDimensionCount >= 10
      && summary.blockingHardeningDimensionCount === summary.hardeningDimensionCount
      && summary.denialCaseCount >= 10
      && summary.blockingDenialCaseCount === summary.denialCaseCount
      && summary.nextStageInputCount >= 6, {
      actual: {
        blockingDenialCaseCount: summary.blockingDenialCaseCount,
        blockingHardeningDimensionCount: summary.blockingHardeningDimensionCount,
        denialCaseCount: summary.denialCaseCount,
        hardeningDimensionCount: summary.hardeningDimensionCount,
        nextStageInputCount: summary.nextStageInputCount
      }
    }),
    check("HIA_WP42_INTAKE_REQUIRED_PREFLIGHT_GATES", summary.hostOwnedApplyRequired === true
      && summary.finalHumanConfirmationRequired === true
      && summary.fileVersionPreflightRequired === true
      && summary.conflictCheckRequired === true
      && summary.rollbackRecordRequired === true
      && summary.formatterValidationRequired === true
      && summary.redactedAuditRequired === true
      && summary.targetOwnerEvidencePreflightRequired === true
      && summary.providerOutputDenialRequired === true, {
      actual: {
        conflictCheckRequired: summary.conflictCheckRequired,
        fileVersionPreflightRequired: summary.fileVersionPreflightRequired,
        finalHumanConfirmationRequired: summary.finalHumanConfirmationRequired,
        formatterValidationRequired: summary.formatterValidationRequired,
        hostOwnedApplyRequired: summary.hostOwnedApplyRequired,
        providerOutputDenialRequired: summary.providerOutputDenialRequired,
        redactedAuditRequired: summary.redactedAuditRequired,
        rollbackRecordRequired: summary.rollbackRecordRequired,
        targetOwnerEvidencePreflightRequired: summary.targetOwnerEvidencePreflightRequired
      }
    }),
    check("HIA_WP42_INTAKE_PROVIDER_AND_TARGET_OWNER_BOUNDARY", summary.providerOutputReviewOnly === true
      && summary.blockedProviderReviewShapeAccepted === true
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.targetOwnerActionRequired === true
      && summary.targetOwnerMaterialReady === true
      && summary.targetOwnerExecutionClaimed === false
      && summary.hiaMayModifyTargetRepository === false, {
      actual: {
        blockedProviderReviewShapeAccepted: summary.blockedProviderReviewShapeAccepted,
        hiaMayModifyTargetRepository: summary.hiaMayModifyTargetRepository,
        providerOutputReviewOnly: summary.providerOutputReviewOnly,
        providerResultProduced: summary.providerResultProduced,
        refusalResultProduced: summary.refusalResultProduced,
        targetOwnerActionRequired: summary.targetOwnerActionRequired,
        targetOwnerExecutionClaimed: summary.targetOwnerExecutionClaimed,
        targetOwnerMaterialReady: summary.targetOwnerMaterialReady
      }
    }),
    check("HIA_WP42_INTAKE_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedInEvidence === false
      && summary.sourceTextIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP42_INTAKE_NEXT_STAGES_READY", nextStageInputs.some((item) => item.phase === "W-P42.2")
      && nextStageInputs.some((item) => item.phase === "W-P42.7")
      && summary.readyForWp43AfterCloseout === true, {
      actual: {
        nextStages: nextStageInputs.map((item) => item.phase),
        readyForWp43AfterCloseout: summary.readyForWp43AfterCloseout
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp42-checked-apply-hardening-intake-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-checked-apply-transaction-hardening-contract" : "blocked",
    sourceEvidence: Object.fromEntries(inputs.map((item) => [item.id, normalizePath(item.path)])),
    hardeningScope: {
      cycleGroupId: "C-HIA-P1",
      phase: "W-P42",
      owner: "host-owned-checked-apply-contract",
      applyAuthority: "host-after-preflight-final-confirmation-and-audit",
      providerOutputPolicy: "review-only-never-direct-edit",
      targetOwnerPolicy: "target-owner-evidence-required-before-target-mutation",
      checkedApplyWriteEnabledInThisStage: false,
      targetRepositoryMutationAllowedInThisStage: false,
      workspaceWriteAllowedInThisStage: false,
      sourcesContentPolicy: "none"
    },
    inputSummaries: inputs.map(toInputSummary),
    hardeningDimensions,
    denialCases,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      summary: normalizePath(summaryPath)
    },
    manualChecks: [
      "Confirm W-P42.2 defines the hardened transaction contract before any checker or host surface consumes it.",
      "Confirm provider output remains review-only and cannot carry WorkspaceEdit, documentChanges or direct edit objects.",
      "Confirm target-owner evidence remains a preflight input and not a claim that target commands have executed.",
      "Confirm real checked apply writes stay deferred until W-P42 closeout and later host-owned UX stages explicitly unlock a narrower path."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P42 checked apply hardening intake evidence");
  assert.equal(hardFailures.length, 0, `W-P42 checked apply hardening intake has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(summaryPath, renderSummary(evidence), "utf8");
  console.log(`W-P42 checked apply hardening intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P42 checked apply hardening intake summary prepared at ${normalizePath(summaryPath)}`);
}

async function readInputs() {
  const entries = [
    input("wp37-closeout", "W-P37", "checked-apply-contract-chain", wp37CloseoutPath),
    input("wp38-closeout", "W-P38", "writable-sandbox-and-host-confirmation", wp38CloseoutPath),
    input("wp40-closeout", "W-P40", "provider-review-only-inputs", wp40CloseoutPath),
    input("wp41-closeout", "W-P41", "target-owner-action-inputs", wp41CloseoutPath)
  ];
  const result = [];
  for (const entry of entries) {
    result.push({
      ...entry,
      evidence: await readJson(entry.path)
    });
  }
  return result;
}

function input(id, phase, topic, filePath) {
  return { id, phase, topic, path: filePath };
}

function summarize({ denialCases, hardeningDimensions, inputs, nextStageInputs }) {
  const wp37 = findInput(inputs, "wp37-closeout").evidence;
  const wp38 = findInput(inputs, "wp38-closeout").evidence;
  const wp40 = findInput(inputs, "wp40-closeout").evidence;
  const wp41 = findInput(inputs, "wp41-closeout").evidence;
  const inputReadiness = inputs.map((entry) => isReadyInput(entry));
  const wp42DownstreamInputs = Array.isArray(wp41.downstreamInputs)
    ? wp41.downstreamInputs.filter((item) => item.phase === "W-P42")
    : [];
  const checkedApplyWriteGate = Array.isArray(wp41.deferredGates)
    ? wp41.deferredGates.find((item) => item.id === "checked-apply-write")
    : undefined;

  return {
    inputEvidenceCount: inputs.length,
    readyInputEvidenceCount: inputReadiness.filter(Boolean).length,
    inputHardFailureCount: inputs.reduce((total, entry) => total + number(entry.evidence.summary?.hardFailureCount), 0),
    wp37Ready: isReadyInput(findInput(inputs, "wp37-closeout")),
    wp38Ready: isReadyInput(findInput(inputs, "wp38-closeout")),
    wp40Ready: isReadyInput(findInput(inputs, "wp40-closeout")),
    wp41Ready: isReadyInput(findInput(inputs, "wp41-closeout")),
    hardeningDimensionCount: hardeningDimensions.length,
    blockingHardeningDimensionCount: hardeningDimensions.filter((item) => item.status === "required-before-write").length,
    denialCaseCount: denialCases.length,
    blockingDenialCaseCount: denialCases.filter((item) => item.defaultDisposition === "deny-before-write").length,
    nextStageInputCount: nextStageInputs.length,
    wp42DownstreamInputCount: wp42DownstreamInputs.length,
    readyForWp43AfterCloseout: wp41.summary?.readyForWp43 === true,
    hostOwnedApplyRequired: wp37.summary?.hostOwnedApplyRequired === true,
    finalHumanConfirmationRequired: number(wp37.summary?.finalHumanConfirmationRequiredCount) >= 2,
    fileVersionPreflightRequired: number(wp37.summary?.fileVersionResultCount) >= 2,
    conflictCheckRequired: number(wp37.summary?.conflictResultCount) >= 2,
    rollbackRecordRequired: number(wp37.summary?.rollbackRecordCount) >= 2,
    formatterValidationRequired: number(wp37.summary?.formatterPlanCount) >= 2
      || number(wp37.summary?.formatterExecutionRequiredAtApplyCount) >= 2,
    redactedAuditRequired: number(wp37.summary?.applyAuditRedactedCount) >= 2,
    targetOwnerEvidencePreflightRequired: wp41.summary?.targetOwnerMaterialReady === true
      && wp41.summary?.targetOwnerActionRequired === true,
    providerOutputDenialRequired: wp40.summary?.reviewOnlyOutputRequired === true
      && wp41.summary?.providerOutputReviewOnly === true,
    sandboxWriteOperationCount: number(wp38.summary?.sandboxWriteOperationCount),
    sandboxApplySuccessCount: number(wp38.summary?.sandboxApplySuccessCount),
    checkedApplyWriteStillDeferred: checkedApplyWriteGate?.status === "deferred-explicitly",
    providerOutputReviewOnly: wp41.summary?.providerOutputReviewOnly === true
      && wp40.summary?.reviewOnlyOutputRequired === true,
    blockedProviderReviewShapeAccepted: wp41.summary?.blockedProviderReviewShapeAccepted === true
      && wp40.summary?.blockedSmokeAcceptedAsCloseoutInput === true,
    providerResultProduced: wp41.summary?.providerResultProduced === true
      || wp40.summary?.providerResultProduced === true,
    refusalResultProduced: wp41.summary?.refusalResultProduced === true
      && wp40.summary?.refusalResultProduced === true,
    targetOwnerActionRequired: wp41.summary?.targetOwnerActionRequired === true,
    targetOwnerMaterialReady: wp41.summary?.targetOwnerMaterialReady === true,
    targetOwnerExecutionClaimed: wp41.summary?.targetOwnerExecutionClaimed === true,
    hiaMayModifyTargetRepository: wp41.summary?.hiaMayModifyTargetRepository === true,
    workspaceWriteAllowedCount: maxNumber(inputs, "workspaceWriteAllowedCount"),
    targetRepositoryMutationCount: maxNumber(inputs, "targetRepositoryMutationCount"),
    targetRepositoryWriteAttemptedCount: maxNumber(inputs, "targetRepositoryWriteAttemptedCount"),
    directApplyAllowedCount: maxNumber(inputs, "directApplyAllowedCount"),
    checkedApplyTriggeredCount: maxNumber(inputs, "checkedApplyTriggeredCount"),
    directEditObjectCount: maxNumber(inputs, "directEditObjectCount"),
    providerOwnedApplyCount: maxNumber(inputs, "providerOwnedApplyCount"),
    lspServerOwnedApplyCount: maxNumber(inputs, "lspServerOwnedApplyCount"),
    sourceReferenceIncludedCount: maxNumber(inputs, "sourceReferenceIncludedCount"),
    sourceTextIncludedCount: maxNumber(inputs, "sourceTextIncludedCount"),
    sourceBodyIncludedInEvidence: inputs.some((entry) => entry.evidence.summary?.sourceBodyIncludedInEvidence === true),
    sourcesContentPolicy: inputs.every((entry) => entry.evidence.summary?.sourcesContentPolicy === "none") ? "none" : "mixed",
    credentialValueIncludedCount: maxNumber(inputs, "credentialValueIncludedCount"),
    credentialMaterialMarkerCount: maxNumber(inputs, "credentialMaterialMarkerCount"),
    forbiddenDocumentTextMarkerCount: maxNumber(inputs, "forbiddenDocumentTextMarkerCount"),
    pathExposureCount: maxNumber(inputs, "pathExposureCount")
  };
}

function findInput(inputs, id) {
  const entry = inputs.find((item) => item.id === id);
  assert.ok(entry, `Missing input ${id}.`);
  return entry;
}

function isReadyInput(entry) {
  const expectedStatuses = new Map([
    ["wp37-closeout", "ready-for-next-cycle-host-apply-and-provider-remote-planning"],
    ["wp38-closeout", "ready-for-next-cycle-planning"],
    ["wp40-closeout", "ready-for-wp41-target-owner-branch-pr-smoke"],
    ["wp41-closeout", "ready-for-wp42-checked-apply-hardening-and-wp43-host-ux-inputs"]
  ]);
  return entry.evidence.status === expectedStatuses.get(entry.id)
    && number(entry.evidence.summary?.hardFailureCount) === 0;
}

function createHardeningDimensions() {
  return [
    dimension("host-owned-apply-authority", "host-shell", "Provider, LSP and direct editor objects must never own apply authority."),
    dimension("final-human-confirmation", "host-shell", "A final explicit confirmation record is required after preview and preflight."),
    dimension("file-version-preflight", "host-shell", "Every write candidate must bind to a host-read file version."),
    dimension("repeat-conflict-check", "host-shell", "Conflict status must be rechecked immediately before apply."),
    dimension("private-rollback-record", "host-shell", "Rollback snapshots stay private and are represented by redacted metadata only."),
    dimension("formatter-and-post-validation", "host-shell", "Formatter and post-apply validation must be planned before write and audited after write."),
    dimension("redacted-apply-audit", "host-shell", "Audit records must omit source bodies, digest values, credentials and local absolute paths."),
    dimension("provider-review-denial", "provider-review", "Provider output is review context and cannot include direct edit instructions."),
    dimension("target-owner-evidence-preflight", "target-owner", "Target-owner command evidence is a preflight input, not an execution claim."),
    dimension("privacy-source-secret-denial", "host-shell", "Source bodies, sourcesContent and credential material remain denied by default."),
    dimension("multi-host-contract-parity", "host-shell", "VS Code, DevTools and Visual Studio must project the same no-direct-apply boundary.")
  ];
}

function dimension(id, owner, reason) {
  return {
    id,
    owner,
    reason,
    status: "required-before-write"
  };
}

function createDenialCases() {
  return [
    denial("provider-direct-edit-object", "Provider result includes a direct edit object."),
    denial("provider-workspace-edit", "Provider result includes WorkspaceEdit or documentChanges payload."),
    denial("missing-final-human-confirmation", "Final confirmation record is absent or stale."),
    denial("missing-host-file-version", "Host file version is absent."),
    denial("stale-file-version", "File version differs from the preflight snapshot."),
    denial("conflict-detected", "Repeat conflict check returns conflict."),
    denial("missing-rollback-record", "Rollback record is absent."),
    denial("formatter-or-validation-plan-missing", "Formatter or post-apply validation plan is absent."),
    denial("audit-record-missing-or-unredacted", "Apply audit record is missing or includes private material."),
    denial("target-owner-evidence-incomplete", "Target-owner transcript or evidence packet is incomplete."),
    denial("source-secret-or-path-exposure", "Request, result or audit includes source text, credential material or local absolute paths.")
  ];
}

function denial(id, reason) {
  return {
    id,
    reason,
    defaultDisposition: "deny-before-write"
  };
}

function createNextStageInputs() {
  return [
    next("W-P42.2", "checked-apply-transaction-hardening-contract", "Define the hardened transaction envelope and invariant set."),
    next("W-P42.3", "preflight-denial-checker-fixtures", "Create deterministic checker fixtures for denial-before-write cases."),
    next("W-P42.4", "rollback-formatter-audit-hardening", "Harden rollback, formatter and audit result requirements."),
    next("W-P42.5", "provider-review-target-owner-boundary", "Bind provider review and target-owner evidence as preflight context only."),
    next("W-P42.6", "multi-host-contract-projection", "Project the hardened contract to VS Code, DevTools and Visual Studio evidence."),
    next("W-P42.7", "closeout-and-wp43-inputs", "Close W-P42 and prepare host UX/provider linkage inputs for W-P43.")
  ];
}

function next(phase, topic, reason) {
  return {
    phase,
    topic,
    status: "planned-input",
    reason
  };
}

function toInputSummary(entry) {
  return {
    id: entry.id,
    phase: entry.phase,
    topic: entry.topic,
    contract: entry.evidence.contract,
    status: entry.evidence.status,
    hardFailureCount: number(entry.evidence.summary?.hardFailureCount),
    ready: isReadyInput(entry)
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function maxNumber(inputs, fieldName) {
  return Math.max(...inputs.map((entry) => number(entry.evidence.summary?.[fieldName])));
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

function renderSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P42 Checked Apply Hardening Intake

## Summary

- status: \`${evidence.status}\`
- input evidence: ${summary.readyInputEvidenceCount} / ${summary.inputEvidenceCount} ready
- hardening dimensions: ${summary.blockingHardeningDimensionCount} / ${summary.hardeningDimensionCount} required before write
- denial cases: ${summary.blockingDenialCaseCount} / ${summary.denialCaseCount} deny before write
- next stage inputs: ${summary.nextStageInputCount}
- checked apply write still deferred: ${summary.checkedApplyWriteStillDeferred}
- workspace write / target mutation / checked apply trigger / direct edit: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount} / ${summary.directEditObjectCount}

## Next Stages

${evidence.nextStageInputs.map((item) => `- ${item.phase}: ${item.topic}`).join("\n")}
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
