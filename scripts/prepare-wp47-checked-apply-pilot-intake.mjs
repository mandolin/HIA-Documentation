import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp47-checked-apply-pilot-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const intakeSummaryPath = path.join(outputRoot, "wp47-checked-apply-pilot-intake-summary.md");
const writeAuthorityBaselinePath = path.join(outputRoot, "wp47-write-authority-baseline.md");
const gateReadinessMatrixPath = path.join(outputRoot, "wp47-pilot-gate-readiness-matrix.md");

const inputPaths = {
  wp42Closeout: path.join(rootDir, "dist", "wp42-closeout-wp43-inputs", "evidence.json"),
  wp42ProviderTargetBoundary: path.join(rootDir, "dist", "wp42-provider-review-target-owner-boundary", "evidence.json"),
  wp43Closeout: path.join(rootDir, "dist", "wp43-closeout-c-hia-p1-inputs", "evidence.json"),
  wp45Closeout: path.join(rootDir, "dist", "wp45-closeout-wp46-wp47-inputs", "evidence.json"),
  wp46HandoffReportPacket: path.join(rootDir, "dist", "wp46-target-owner-handoff-report-packet", "evidence.json"),
  wp46Closeout: path.join(rootDir, "dist", "wp46-closeout-wp47-wp48-inputs", "evidence.json")
};

await main();

/**
 * 生成 W-P47.1 checked apply write pilot intake evidence。
 * Generate W-P47.1 checked apply write pilot intake evidence.
 *
 * 中文：本阶段消费 W-P42 checked apply hardening、W-P43 host-owned UX、
 * W-P45 blocked provider review-only closeout 与 W-P46 target-owner metadata-only
 * 输入，固定 W-P47 写入试点准备基线。它只声明进入后续试点前必须满足的
 * host-owned confirmation、file version/conflict、rollback/formatter/audit、
 * target-owner final action 与 privacy gates，不启用 checked apply 写入。
 *
 * English: This stage consumes W-P42 checked-apply hardening, W-P43 host-owned
 * UX, W-P45 blocked provider review-only closeout, and W-P46 target-owner
 * metadata-only inputs to fix the W-P47 write-pilot preparation baseline. It
 * declares the host-owned confirmation, file version/conflict,
 * rollback/formatter/audit, target-owner final action, and privacy gates that
 * must be satisfied before a later pilot can write. It does not enable checked
 * apply writes.
 *
 * @returns {Promise<void>} Writes public-safe W-P47.1 intake evidence and reports.
 */
async function main() {
  const inputs = await readInputs(inputPaths);
  const pilotGates = createPilotGateBaseline();
  const denialCases = createDenialBeforeWritePilotCases();
  const nextStageInputs = createNextStageInputs();
  const wp46MetadataInputs = normalizeWp46MetadataInputs(inputs.wp46Closeout);
  const summary = summarize({
    denialCases,
    inputs,
    nextStageInputs,
    pilotGates,
    wp46MetadataInputs
  });
  const checks = [
    check("HIA_WP47_INTAKE_INPUTS_READY", summary.inputEvidenceCount === 6
      && summary.readyInputEvidenceCount === 6
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP47_INTAKE_PRIOR_CHAIN_READY", summary.wp42CheckedApplyHardeningReady === true
      && summary.wp43HostOwnedUxReady === true
      && summary.wp45ProviderReviewOnlyReady === true
      && summary.wp46TargetOwnerMetadataOnlyReady === true
      && summary.wp46HandoffReportReady === true, {
      actual: {
        wp42CheckedApplyHardeningReady: summary.wp42CheckedApplyHardeningReady,
        wp43HostOwnedUxReady: summary.wp43HostOwnedUxReady,
        wp45ProviderReviewOnlyReady: summary.wp45ProviderReviewOnlyReady,
        wp46HandoffReportReady: summary.wp46HandoffReportReady,
        wp46TargetOwnerMetadataOnlyReady: summary.wp46TargetOwnerMetadataOnlyReady
      }
    }),
    check("HIA_WP47_INTAKE_METADATA_ONLY_INPUTS", summary.wp46Wp47InputCount >= 9
      && summary.wp46Wp47MetadataOnlyInputCount === summary.wp46Wp47InputCount
      && summary.wp46Wp47CheckedApplyWriteEnabledCount === 0
      && summary.wp46Wp47TargetMutationAllowedCount === 0
      && summary.wp46Wp47SourceBodyRequiredCount === 0, {
      actual: {
        wp46Wp47CheckedApplyWriteEnabledCount: summary.wp46Wp47CheckedApplyWriteEnabledCount,
        wp46Wp47InputCount: summary.wp46Wp47InputCount,
        wp46Wp47MetadataOnlyInputCount: summary.wp46Wp47MetadataOnlyInputCount,
        wp46Wp47SourceBodyRequiredCount: summary.wp46Wp47SourceBodyRequiredCount,
        wp46Wp47TargetMutationAllowedCount: summary.wp46Wp47TargetMutationAllowedCount
      }
    }),
    check("HIA_WP47_INTAKE_GATE_BASELINE_DECLARED", summary.pilotGateCount >= 14
      && summary.requiredBeforeWritePilotGateCount === summary.pilotGateCount
      && summary.denialCaseCount >= 11
      && summary.denyBeforeWritePilotCaseCount === summary.denialCaseCount
      && summary.nextStageInputCount >= 6, {
      actual: {
        denialCaseCount: summary.denialCaseCount,
        denyBeforeWritePilotCaseCount: summary.denyBeforeWritePilotCaseCount,
        nextStageInputCount: summary.nextStageInputCount,
        pilotGateCount: summary.pilotGateCount,
        requiredBeforeWritePilotGateCount: summary.requiredBeforeWritePilotGateCount
      }
    }),
    check("HIA_WP47_INTAKE_NO_WRITE_AUTHORITY", summary.checkedApplyWriteEnabled === false
      && summary.pilotWriteAuthorized === false
      && summary.hostEditorApiCallCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabled: summary.checkedApplyWriteEnabled,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        pilotWriteAuthorized: summary.pilotWriteAuthorized,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP47_INTAKE_PROVIDER_TARGET_OWNER_BOUNDARY", summary.providerOutputReviewOnlyRequired === true
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.ownerSubmittedReportCount === 0
      && summary.ownerSubmittedReportRequiredBeforePilot === true
      && summary.targetOwnerFinalActionRequired === true
      && summary.hiaMayRunTargetCommand === false
      && summary.hiaMayMutateTargetRepository === false, {
      actual: {
        hiaMayMutateTargetRepository: summary.hiaMayMutateTargetRepository,
        hiaMayRunTargetCommand: summary.hiaMayRunTargetCommand,
        ownerSubmittedReportCount: summary.ownerSubmittedReportCount,
        ownerSubmittedReportRequiredBeforePilot: summary.ownerSubmittedReportRequiredBeforePilot,
        providerOutputReviewOnlyRequired: summary.providerOutputReviewOnlyRequired,
        providerResultProduced: summary.providerResultProduced,
        refusalResultProduced: summary.refusalResultProduced,
        targetOwnerFinalActionRequired: summary.targetOwnerFinalActionRequired
      }
    }),
    check("HIA_WP47_INTAKE_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.requestBodyIncludedCount === 0
      && summary.responseBodyIncludedCount === 0
      && summary.secretValueIncludedCount === 0
      && summary.localAbsolutePathDetectedCount === 0
      && summary.credentialMaterialMarkerCount === 0
      && summary.sourcesContentMarkerCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        localAbsolutePathDetectedCount: summary.localAbsolutePathDetectedCount,
        requestBodyIncludedCount: summary.requestBodyIncludedCount,
        responseBodyIncludedCount: summary.responseBodyIncludedCount,
        secretValueIncludedCount: summary.secretValueIncludedCount,
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentMarkerCount: summary.sourcesContentMarkerCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP47_INTAKE_NEXT_STAGE_READY", summary.readyForWp47HostOwnedPilotTransactionEnvelope === true
      && summary.nextStage === "W-P47.2 Host-Owned Pilot Transaction Envelope", {
      actual: {
        nextStage: summary.nextStage,
        readyForWp47HostOwnedPilotTransactionEnvelope: summary.readyForWp47HostOwnedPilotTransactionEnvelope
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  assert.equal(hardFailures.length, 0, `W-P47.1 checked apply pilot intake has ${hardFailures.length} hard failure(s).`);

  const evidence = {
    contract: "hia-wp47-checked-apply-write-pilot-intake",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: "ready-for-wp47-host-owned-pilot-transaction-envelope",
    sourceEvidence: Object.fromEntries(Object.entries(inputPaths).map(([key, value]) => [key, normalizePath(value)])),
    pilotPreparationPolicy: {
      phase: "W-P47.1",
      cycleGroupId: "C-HIA-P2",
      policy: "pilot-preparation-only-no-write-authority",
      applyAuthorityOwner: "host",
      providerPolicy: "review-only-context-never-direct-edit",
      targetOwnerPolicy: "target-owner-final-action-required-before-pilot-write",
      checkedApplyWriteEnabledByThisStage: false,
      pilotWriteAuthorizedByThisStage: false,
      targetRepositoryMutationAllowedByThisStage: false,
      workspaceWriteAllowedByThisStage: false,
      sourceBodyAllowedByThisStage: false,
      sourcesContentPolicy: "none"
    },
    inputSummaries: Object.entries(inputs).map(([id, evidenceItem]) => toInputSummary(id, evidenceItem)),
    wp46MetadataOnlyInputs: wp46MetadataInputs,
    pilotGateBaseline: pilotGates,
    denialBeforeWritePilotCases: denialCases,
    nextStageInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      gateReadinessMatrix: normalizePath(gateReadinessMatrixPath),
      intakeSummary: normalizePath(intakeSummaryPath),
      writeAuthorityBaseline: normalizePath(writeAuthorityBaselinePath)
    },
    manualChecks: [
      "Confirm W-P47.2 defines a host-owned transaction envelope before any host surface can present a write pilot.",
      "Confirm owner-submitted metadata remains metadata-only until the target owner supplies a final action report.",
      "Confirm file version/conflict preflight, rollback, formatter, post-validation and redacted audit are required before any write pilot.",
      "Confirm provider output remains review-only and cannot carry WorkspaceEdit, documentChanges or direct edit objects."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P47.1 checked apply pilot intake evidence");

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(intakeSummaryPath, renderIntakeSummary(evidence), "utf8");
  await writeFile(writeAuthorityBaselinePath, renderWriteAuthorityBaseline(evidence), "utf8");
  await writeFile(gateReadinessMatrixPath, renderGateReadinessMatrix(evidence), "utf8");

  for (const [label, filePath] of Object.entries({
    evidence: evidencePath,
    gateReadinessMatrix: gateReadinessMatrixPath,
    intakeSummary: intakeSummaryPath,
    writeAuthorityBaseline: writeAuthorityBaselinePath
  })) {
    assertNoPrivateMarkers(await readFile(filePath, "utf8"), label);
  }

  console.log(`W-P47 checked apply pilot intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P47 checked apply pilot intake summary prepared at ${normalizePath(intakeSummaryPath)}`);
}

async function readInputs(paths) {
  return Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([key, filePath]) => [key, await readJson(filePath)])
  ));
}

function createPilotGateBaseline() {
  return [
    gate("host-owned-apply-authority", "Host remains the only apply authority; provider and LSP cannot own apply.", "W-P42/W-P43"),
    gate("final-human-confirmation", "A human target owner must explicitly confirm the final action before a write pilot.", "W-P37/W-P43"),
    gate("host-file-version-snapshot", "The host must read file version metadata immediately before the pilot.", "W-P37/W-P42"),
    gate("repeat-conflict-check", "The host must repeat conflict preflight after confirmation and before write.", "W-P37/W-P42"),
    gate("target-owner-metadata-only-input", "W-P46 target-owner inputs remain metadata-only until accepted by the host.", "W-P46"),
    gate("owner-submitted-report-required", "A target-owner submitted report is required before pilot execution.", "W-P46"),
    gate("provider-review-only-result", "Provider result/refusal remains review-only context and never becomes a direct edit.", "W-P45"),
    gate("rollback-record-required", "A rollback record must exist before the host can apply a pilot write.", "W-P37/W-P42"),
    gate("formatter-plan-required", "A formatter plan and formatter safety decision must exist before write.", "W-P37/W-P42"),
    gate("post-apply-validation-plan", "Post-apply validation must be planned and visible before the host writes.", "W-P42"),
    gate("redacted-audit-required", "A redacted audit record is required and must exclude source bodies and secrets.", "W-P37/W-P42"),
    gate("source-privacy-none", "Default source privacy remains metadata-only with sourcesContentPolicy none.", "W-P45/W-P46"),
    gate("target-mutation-boundary", "HIA automation cannot mutate target repositories; target owner owns target actions.", "W-P41/W-P46"),
    gate("multi-host-read-only-projection", "VS Code, DevTools and Visual Studio can display readiness without gaining write authority.", "W-P42/W-P43"),
    gate("no-direct-edit-object", "Pilot inputs must not include WorkspaceEdit, documentChanges or other direct edit payloads.", "W-P42/W-P45")
  ];
}

function gate(id, description, source) {
  return {
    id,
    description,
    source,
    status: "required-before-write-pilot",
    currentReadiness: "declared-for-wp47-pilot-preparation",
    satisfiedByThisStage: false,
    writeAuthorityGrantedByThisGate: false
  };
}

function createDenialBeforeWritePilotCases() {
  return [
    denial("missing-host-final-confirmation", "Host final confirmation is missing."),
    denial("missing-file-version-snapshot", "Host file version snapshot is missing or stale."),
    denial("conflict-not-checked", "Conflict preflight has not been executed by the host."),
    denial("owner-report-missing", "Target owner submitted report metadata is absent."),
    denial("provider-success-claim-used-as-edit", "Provider output claims executable success or is treated as edit authority."),
    denial("direct-edit-object-present", "Pilot input contains WorkspaceEdit, documentChanges or equivalent direct edit data."),
    denial("source-body-present", "Pilot input includes source body, request body, response body or sourcesContent."),
    denial("secret-or-credential-present", "Pilot input contains credential values or credential-like material."),
    denial("rollback-or-formatter-missing", "Rollback record, formatter plan or post-validation plan is missing."),
    denial("audit-unredacted-or-missing", "Redacted audit is missing or not public-safe."),
    denial("hia-target-mutation-claim", "HIA automation claims branch, PR, sandbox, target command or repository mutation authority."),
    denial("host-surface-not-ready", "The selected host surface cannot display target-owner action, preflight and rollback/audit state.")
  ];
}

function denial(id, description) {
  return {
    id,
    description,
    defaultDisposition: "deny-before-write-pilot",
    writeAuthorityGranted: false,
    targetMutationAllowed: false
  };
}

function createNextStageInputs() {
  return [
    nextStage("W-P47.2", "Host-Owned Pilot Transaction Envelope", "Define the pilot transaction envelope, required fields and invariants."),
    nextStage("W-P47.3", "File Version And Conflict Preflight Pilot Gate", "Turn file-version and conflict requirements into deterministic pilot fixtures."),
    nextStage("W-P47.4", "Rollback Formatter Audit Pilot Gate", "Bind rollback, formatter, post-validation and redacted audit to the pilot envelope."),
    nextStage("W-P47.5", "Host Confirmation Surface Pilot Packet", "Project the pilot confirmation state into VS Code, DevTools and Visual Studio without enabling write by default."),
    nextStage("W-P47.6", "Target-Owner Pilot Dry-Run Report Intake", "Accept target-owner submitted pilot dry-run report metadata and keep HIA target mutation disabled."),
    nextStage("W-P47.7", "Closeout And W-P48 Inputs", "Close W-P47 and split W-P48/C-HIA-P2 closeout inputs from deferred real write gates.")
  ];
}

function nextStage(phase, topic, requirement) {
  return {
    phase,
    topic,
    requirement,
    status: "ready-input",
    writeAuthorityGranted: false
  };
}

function normalizeWp46MetadataInputs(wp46Closeout) {
  const container = wp46Closeout.wp47CheckedApplyPilotPreparationInputs;
  const items = Array.isArray(container?.items) ? container.items : [];
  return {
    contract: container?.contract ?? "unknown",
    inputStatus: container?.inputStatus ?? "unknown",
    itemCount: items.length,
    metadataOnlyItemCount: items.filter((item) => item.inputKind === "target-owner-submitted-metadata-only").length,
    items: items.map((item) => ({
      checkedApplyWriteEnabled: item.checkedApplyWriteEnabled === true,
      id: item.id,
      inputKind: item.inputKind,
      sourceBodyRequired: item.sourceBodyRequired === true,
      status: item.status,
      targetOwnerSubmittedOnly: item.targetOwnerSubmittedOnly === true,
      targetRepositoryMutationAllowed: item.targetRepositoryMutationAllowed === true
    }))
  };
}

function summarize({ denialCases, inputs, nextStageInputs, pilotGates, wp46MetadataInputs }) {
  const publicSurface = JSON.stringify({
    denialCases,
    nextStageInputs,
    pilotGates,
    wp46MetadataInputs
  });
  const inputEntries = Object.entries(inputs);
  const readyInputEvidenceCount = inputEntries.filter(([, evidence]) => isReadyEvidence(evidence)).length;
  const wp45Summary = inputs.wp45Closeout.summary ?? {};
  const wp46Summary = inputs.wp46Closeout.summary ?? {};
  const wp42Summary = inputs.wp42Closeout.summary ?? {};
  const wp43Summary = inputs.wp43Closeout.summary ?? {};
  const wp42BoundarySummary = inputs.wp42ProviderTargetBoundary.summary ?? {};
  const wp46HandoffSummary = inputs.wp46HandoffReportPacket.summary ?? {};

  return {
    phase: "W-P47.1",
    inputEvidenceCount: inputEntries.length,
    readyInputEvidenceCount,
    inputHardFailureCount: sum(inputEntries.map(([, evidence]) => evidence.summary?.hardFailureCount)),
    wp42CheckedApplyHardeningReady: inputs.wp42Closeout.status === "ready-for-wp43-host-owned-apply-ux-inputs"
      && wp42Summary.checkedApplyWriteEnabled === false,
    wp42ProviderTargetBoundaryReady: inputs.wp42ProviderTargetBoundary.status === "ready-for-multi-host-contract-projection"
      && number(wp42BoundarySummary.requiredBoundaryControlCount) >= 10,
    wp43HostOwnedUxReady: inputs.wp43Closeout.status === "ready-for-c-hia-p1-closeout"
      || wp43Summary.readyForCycleGroupCloseout === true,
    wp45ProviderReviewOnlyReady: inputs.wp45Closeout.status === "ready-for-wp46-target-owner-evidence-ingestion-and-wp47-checked-apply-pilot-inputs"
      && wp45Summary.reviewOnlyOutputRequired === true
      && wp45Summary.executionDecisionStatus === "blocked-before-network",
    wp46TargetOwnerMetadataOnlyReady: inputs.wp46Closeout.status === "ready-for-wp47-checked-apply-pilot-preparation-and-wp48-cycle-closeout"
      && wp46Summary.readyForWp47CheckedApplyPreparation === true,
    wp46HandoffReportReady: inputs.wp46HandoffReportPacket.status === "ready-for-wp46-closeout-and-wp47-wp48-inputs"
      && number(wp46HandoffSummary.wp47InputCount) >= 9,
    wp46Wp47InputCount: number(wp46Summary.wp47InputCount),
    wp46Wp47MetadataOnlyInputCount: number(wp46Summary.wp47MetadataOnlyInputCount),
    wp46Wp47CheckedApplyWriteEnabledCount: number(wp46Summary.wp47CheckedApplyWriteEnabledCount),
    wp46Wp47TargetMutationAllowedCount: number(wp46Summary.wp47TargetMutationAllowedCount),
    wp46Wp47SourceBodyRequiredCount: number(wp46Summary.wp47SourceBodyRequiredCount),
    pilotGateCount: pilotGates.length,
    requiredBeforeWritePilotGateCount: pilotGates.filter((item) => item.status === "required-before-write-pilot").length,
    satisfiedByThisStageGateCount: pilotGates.filter((item) => item.satisfiedByThisStage === true).length,
    denialCaseCount: denialCases.length,
    denyBeforeWritePilotCaseCount: denialCases.filter((item) => item.defaultDisposition === "deny-before-write-pilot").length,
    nextStageInputCount: nextStageInputs.length,
    checkedApplyWriteEnabled: false,
    pilotWriteAuthorized: false,
    hostEditorApiCallCount: 0,
    checkedApplyTriggeredCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects(publicSurface),
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    providerOutputReviewOnlyRequired: wp45Summary.reviewOnlyOutputRequired === true,
    providerResultProduced: wp45Summary.providerResultProduced === true,
    refusalResultProduced: wp45Summary.refusalResultProduced === true,
    ownerSubmittedReportCount: number(wp46Summary.ownerSubmittedReportCount),
    ownerSubmittedReportRequiredBeforePilot: true,
    targetOwnerFinalActionRequired: true,
    hiaMayRunTargetCommand: false,
    hiaMayCreateBranchOrPr: false,
    hiaMayCreateSandbox: false,
    hiaMayMutateTargetRepository: false,
    sourceBodyIncludedCount: 0,
    sourceTextIncludedCount: 0,
    requestBodyIncludedCount: 0,
    responseBodyIncludedCount: 0,
    secretValueIncludedCount: 0,
    localAbsolutePathDetectedCount: countPathExposure(publicSurface),
    credentialMaterialMarkerCount: countCredentialMarkers(publicSurface),
    sourcesContentMarkerCount: /"sourcesContent"\s*:/iu.test(publicSurface) ? 1 : 0,
    sourcesContentPolicy: "none",
    readyForWp47HostOwnedPilotTransactionEnvelope: true,
    nextStage: "W-P47.2 Host-Owned Pilot Transaction Envelope",
    hardFailureCount: 0
  };
}

function toInputSummary(id, evidence) {
  return {
    id,
    contract: evidence.contract,
    contractVersion: evidence.contractVersion,
    status: evidence.status,
    ready: isReadyEvidence(evidence),
    hardFailureCount: number(evidence.summary?.hardFailureCount),
    checkedApplyWriteEnabled: evidence.summary?.checkedApplyWriteEnabled === true
      || number(evidence.summary?.checkedApplyWriteEnabledCount) > 0,
    workspaceWriteAllowedCount: number(evidence.summary?.workspaceWriteAllowedCount),
    targetRepositoryMutationCount: number(evidence.summary?.targetRepositoryMutationCount),
    sourceTextIncludedCount: number(evidence.summary?.sourceTextIncludedCount),
    pathExposureCount: number(evidence.summary?.pathExposureCount)
      + number(evidence.summary?.localAbsolutePathDetectedCount)
  };
}

function isReadyEvidence(evidence) {
  return typeof evidence.status === "string"
    && evidence.status.startsWith("ready-for-")
    && number(evidence.summary?.hardFailureCount) === 0;
}

function renderIntakeSummary(evidence) {
  return `# W-P47.1 Checked Apply Pilot Intake Summary

## 中文摘要

W-P47.1 已把 W-P42 checked apply hardening、W-P43 host-owned apply UX、W-P45 blocked provider review-only closeout 与 W-P46 target-owner metadata-only 输入汇总为写入试点准备基线。本阶段只声明后续试点必须满足的门禁，不启用 checked apply 写入。

## Summary

- status: \`${evidence.status}\`
- inputs ready: ${evidence.summary.readyInputEvidenceCount} / ${evidence.summary.inputEvidenceCount}
- W-P46 metadata-only inputs: ${evidence.summary.wp46Wp47MetadataOnlyInputCount} / ${evidence.summary.wp46Wp47InputCount}
- pilot gates: ${evidence.summary.pilotGateCount}
- denial-before-write pilot cases: ${evidence.summary.denialCaseCount}
- owner submitted reports: ${evidence.summary.ownerSubmittedReportCount}
- checked apply write enabled: ${evidence.summary.checkedApplyWriteEnabled ? "yes" : "no"}
- next stage: \`${evidence.summary.nextStage}\`

## Boundary

W-P47.1 不调用宿主编辑 API，不触发 checked apply，不写 workspace，不修改目标仓库，不运行目标命令，不执行 provider/network，也不保存源码正文、request/response body、secret、本地绝对路径或 sourcesContent。
`;
}

function renderWriteAuthorityBaseline(evidence) {
  const rows = [
    ["Host apply authority", "host-owned", "required-before-write-pilot"],
    ["Provider apply authority", "not-allowed", "denied"],
    ["LSP apply authority", "not-allowed", "denied"],
    ["Target owner final action", "required", "not-yet-submitted"],
    ["Workspace write", "disabled", "not-authorized"],
    ["Target repository mutation", "disabled", "not-authorized"],
    ["Checked apply trigger", "disabled", "not-authorized"],
    ["Source body", "not included", "sourcesContentPolicy none"]
  ];

  return `# W-P47.1 Write Authority Baseline

## 中文摘要

W-P47.1 的写入权基线是“宿主拥有、人工最终确认、试点前仍关闭”。W-P46.7 的 metadata-only 输入不能被解释为写入授权。

| Area | Current State | Decision |
| --- | --- | --- |
${rows.map((row) => `| ${row[0]} | \`${row[1]}\` | \`${row[2]}\` |`).join("\n")}

## Required Before Any Pilot Write

- Host-owned transaction envelope.
- Host file version snapshot and repeat conflict preflight.
- Rollback record, formatter plan, post-apply validation plan and redacted audit.
- Target-owner submitted final action report.
- Privacy check proving source body, secret and local path are absent.
`;
}

function renderGateReadinessMatrix(evidence) {
  const gateRows = evidence.pilotGateBaseline
    .map((gateItem) => `| \`${gateItem.id}\` | ${gateItem.source} | \`${gateItem.status}\` | ${gateItem.satisfiedByThisStage ? "yes" : "no"} |`)
    .join("\n");
  const denialRows = evidence.denialBeforeWritePilotCases
    .map((item) => `| \`${item.id}\` | ${item.description} | \`${item.defaultDisposition}\` |`)
    .join("\n");

  return `# W-P47.1 Pilot Gate Readiness Matrix

## 中文摘要

下列门禁均已被声明为 W-P47 写入试点前置条件。W-P47.1 只完成 intake 与 baseline，未把任何门禁标记为已满足并授予写入权。

| Gate | Source | Status | Satisfied By W-P47.1 |
| --- | --- | --- | --- |
${gateRows}

## Denial Cases

| Case | Reason | Default Disposition |
| --- | --- | --- |
${denialRows}
`;
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

function countDirectEditObjects(serialized) {
  return /"workspaceEdit"|"documentChanges"|"TextEdit\["/iu.test(serialized) ? 1 : 0;
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
