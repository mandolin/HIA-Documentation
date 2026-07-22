import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp42-closeout-wp43-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutSummaryPath = path.join(outputRoot, "wp42-closeout-summary.md");
const wp43InputsPath = path.join(outputRoot, "wp43-host-ux-inputs.md");
const hardeningIntakePath = path.join(rootDir, "dist", "wp42-checked-apply-hardening-intake", "evidence.json");
const transactionContractPath = path.join(rootDir, "dist", "wp42-checked-apply-transaction-hardening-contract", "evidence.json");
const denialCheckerPath = path.join(rootDir, "dist", "wp42-preflight-denial-checker-fixtures", "evidence.json");
const rollbackAuditHardeningPath = path.join(rootDir, "dist", "wp42-rollback-formatter-audit-hardening", "evidence.json");
const providerTargetBoundaryPath = path.join(rootDir, "dist", "wp42-provider-review-target-owner-boundary", "evidence.json");
const multiHostProjectionPath = path.join(rootDir, "dist", "wp42-multi-host-contract-projection", "evidence.json");

await main();

/**
 * 准备 W-P42 closeout 与 W-P43 host UX 输入证据。
 * Prepare W-P42 closeout and W-P43 host UX input evidence.
 *
 * This stage summarizes W-P42.1-W-P42.6 into downstream inputs for W-P43
 * host-owned apply UX and provider review linkage. It closes the hardening
 * cycle only; it does not enable checked-apply writes, host editor APIs,
 * provider execution, target commands or target repository mutation.
 *
 * 中文：本阶段把 W-P42.1-W-P42.6 汇总为 W-P43 host-owned apply UX 与 provider
 * review linkage 的下游输入。它只收口硬化周期，不启用 checked apply 写入、不调用宿主
 * 编辑 API、不执行 provider、不运行目标项目命令，也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P42 closeout evidence and W-P43 input docs.
 */
async function main() {
  const inputs = await readInputs();
  const completedCapabilities = createCompletedCapabilities(inputs);
  const deferredGates = createDeferredGates();
  const wp43Inputs = createWp43Inputs();
  const summary = summarize({
    completedCapabilities,
    deferredGates,
    inputs,
    wp43Inputs
  });
  const checks = [
    check("HIA_WP42_CLOSEOUT_INPUTS_READY", summary.inputEvidenceCount === 6
      && summary.readyInputEvidenceCount === 6
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP42_CLOSEOUT_PHASES_COMPLETE", summary.completedPhaseCount === 6
      && summary.completedCapabilityCount >= 6
      && summary.wp43InputCount >= 6, {
      actual: {
        completedCapabilityCount: summary.completedCapabilityCount,
        completedPhaseCount: summary.completedPhaseCount,
        wp43InputCount: summary.wp43InputCount
      }
    }),
    check("HIA_WP42_CLOSEOUT_NO_WRITE_OR_EXECUTION", summary.checkedApplyWriteEnabled === false
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandExecutedByHiaCount === 0
      && summary.actualRuntimeCaptureExecutedCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabled: summary.checkedApplyWriteEnabled,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetCommandExecutedByHiaCount: summary.targetCommandExecutedByHiaCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP42_CLOSEOUT_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
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
    check("HIA_WP42_CLOSEOUT_WP43_READY", summary.readyForWp43HostUx === true
      && wp43Inputs.some((item) => item.topic === "host-owned-apply-ux")
      && wp43Inputs.some((item) => item.topic === "provider-review-linkage")
      && wp43Inputs.some((item) => item.topic === "target-owner-evidence-view"), {
      actual: {
        readyForWp43HostUx: summary.readyForWp43HostUx,
        wp43Topics: wp43Inputs.map((item) => item.topic)
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp42-closeout-wp43-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp43-host-owned-apply-ux-inputs" : "blocked",
    sourceEvidence: {
      hardeningIntake: normalizePath(hardeningIntakePath),
      transactionContract: normalizePath(transactionContractPath),
      denialChecker: normalizePath(denialCheckerPath),
      rollbackAuditHardening: normalizePath(rollbackAuditHardeningPath),
      providerTargetBoundary: normalizePath(providerTargetBoundaryPath),
      multiHostProjection: normalizePath(multiHostProjectionPath)
    },
    closeout: {
      cycleGroupId: "C-HIA-P1",
      phase: "W-P42",
      closeoutStatus: "completed-first-round",
      downstreamPhase: "W-P43",
      checkedApplyWriteEnabledByCloseout: false,
      sourcesContentPolicy: "none"
    },
    completedCapabilities,
    deferredGates,
    wp43Inputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      closeoutSummary: normalizePath(closeoutSummaryPath),
      wp43Inputs: normalizePath(wp43InputsPath)
    },
    manualChecks: [
      "Confirm W-P43 treats these outputs as host UX inputs, not write-enabled implementation.",
      "Confirm checked apply write authority remains deferred after W-P42 closeout.",
      "Confirm real provider/network execution and target-owner actions still need explicit future gates.",
      "Confirm actual VS Code, DevTools and Visual Studio runtime captures remain separately evidenced manual gates."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P42 closeout evidence");
  assert.equal(hardFailures.length, 0, `W-P42 closeout has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutSummaryPath, renderCloseoutSummary(evidence), "utf8");
  await writeFile(wp43InputsPath, renderWp43Inputs(wp43Inputs), "utf8");
  console.log(`W-P42 closeout evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P42 closeout summary prepared at ${normalizePath(closeoutSummaryPath)}`);
  console.log(`W-P43 host UX inputs prepared at ${normalizePath(wp43InputsPath)}`);
}

async function readInputs() {
  return [
    input("W-P42.1", "checked-apply-hardening-intake", hardeningIntakePath, await readJson(hardeningIntakePath), "ready-for-checked-apply-transaction-hardening-contract"),
    input("W-P42.2", "checked-apply-transaction-hardening-contract", transactionContractPath, await readJson(transactionContractPath), "ready-for-preflight-denial-checker-fixtures"),
    input("W-P42.3", "preflight-denial-checker-fixtures", denialCheckerPath, await readJson(denialCheckerPath), "ready-for-rollback-formatter-audit-hardening"),
    input("W-P42.4", "rollback-formatter-audit-hardening", rollbackAuditHardeningPath, await readJson(rollbackAuditHardeningPath), "ready-for-provider-review-target-owner-boundary"),
    input("W-P42.5", "provider-review-target-owner-boundary", providerTargetBoundaryPath, await readJson(providerTargetBoundaryPath), "ready-for-multi-host-contract-projection"),
    input("W-P42.6", "multi-host-contract-projection", multiHostProjectionPath, await readJson(multiHostProjectionPath), "ready-for-wp42-closeout-and-wp43-inputs")
  ];
}

function input(phase, topic, filePath, evidence, readyStatus) {
  return {
    phase,
    topic,
    path: filePath,
    evidence,
    readyStatus
  };
}

function createCompletedCapabilities(inputs) {
  return inputs.map((entry) => ({
    phase: entry.phase,
    topic: entry.topic,
    status: entry.evidence.status === entry.readyStatus ? "completed-first-round" : "blocked",
    sourceEvidence: normalizePath(entry.path),
    writeAuthorityGranted: false,
    targetRepositoryMutationAllowed: false
  }));
}

function createDeferredGates() {
  return [
    deferred("checked-apply-write", "No W-P42 stage enables real checked apply write authority."),
    deferred("real-host-runtime-capture", "W-P42.6 prepares read-only projection packets but does not claim GUI/runtime capture."),
    deferred("real-provider-network", "Provider/network execution still requires concrete provider, destination, secret reference and final consent."),
    deferred("target-owner-execution", "Target-owner commands, branch, PR and sandbox actions remain target-owner executed, not HIA executed."),
    deferred("target-repository-mutation", "Target repository mutation remains forbidden to HIA automation."),
    deferred("post-closeout-host-ux-implementation", "W-P43 must consume this closeout as UX input before any later write-enabled implementation.")
  ];
}

function deferred(id, reason) {
  return {
    id,
    reason,
    status: "deferred-explicitly"
  };
}

function createWp43Inputs() {
  return [
    wp43Input("host-owned-apply-ux", "Render checked apply contract, denial reasons, final confirmation and blocked write boundary."),
    wp43Input("provider-review-linkage", "Render provider review context and future provider result/refusal shapes as review-only."),
    wp43Input("target-owner-evidence-view", "Render target-owner evidence completeness and next target-owner actions without claiming execution."),
    wp43Input("rollback-formatter-audit-panel", "Render rollback, formatter, post-validation and audit controls before any write path."),
    wp43Input("multi-host-read-only-projection", "Reuse VS Code, DevTools and Visual Studio projection packets as host UX inputs."),
    wp43Input("deferred-write-gate-banner", "Show that checked apply write, provider/network and target mutation remain deferred.")
  ];
}

function wp43Input(topic, description) {
  return {
    phase: "W-P43",
    topic,
    description,
    status: "ready-input",
    writeAuthorityGranted: false
  };
}

function summarize({ completedCapabilities, deferredGates, inputs, wp43Inputs }) {
  const summaries = inputs.map((entry) => entry.evidence.summary);
  const multiHostSummary = inputs.find((entry) => entry.phase === "W-P42.6").evidence.summary;
  return {
    inputEvidenceCount: inputs.length,
    readyInputEvidenceCount: inputs.filter((entry) => entry.evidence.status === entry.readyStatus).length,
    inputHardFailureCount: summaries.reduce((total, summary) => total + number(summary?.hardFailureCount), 0),
    completedPhaseCount: completedCapabilities.filter((item) => item.status === "completed-first-round").length,
    completedCapabilityCount: completedCapabilities.length,
    deferredGateCount: deferredGates.length,
    wp43InputCount: wp43Inputs.length,
    readyWp43InputCount: wp43Inputs.filter((item) => item.status === "ready-input").length,
    readyForWp43HostUx: wp43Inputs.every((item) => item.status === "ready-input"),
    checkedApplyWriteEnabled: false,
    workspaceWriteAllowedCount: maxSummary(summaries, "workspaceWriteAllowedCount"),
    targetRepositoryMutationCount: maxSummary(summaries, "targetRepositoryMutationCount"),
    checkedApplyTriggeredCount: maxSummary(summaries, "checkedApplyTriggeredCount"),
    directApplyAllowedCount: maxSummary(summaries, "directApplyAllowedCount"),
    directEditObjectCount: maxSummary(summaries, "directEditObjectCount"),
    providerOwnedApplyCount: maxSummary(summaries, "providerOwnedApplyCount"),
    lspServerOwnedApplyCount: maxSummary(summaries, "lspServerOwnedApplyCount"),
    providerNetworkExecutedCount: maxSummary(summaries, "providerNetworkExecutedCount"),
    targetCommandExecutedByHiaCount: maxSummary(summaries, "targetCommandExecutedByHiaCount"),
    actualRuntimeCaptureExecutedCount: number(multiHostSummary?.actualRuntimeCaptureExecutedCount),
    sourceBodyIncludedInEvidence: summaries.some((summary) => summary?.sourceBodyIncludedInEvidence === true),
    sourceReferenceIncludedCount: maxSummary(summaries, "sourceReferenceIncludedCount"),
    documentContentIncludedInEvidenceCount: maxSummary(summaries, "documentContentIncludedInEvidenceCount"),
    digestValueIncludedInEvidenceCount: maxSummary(summaries, "digestValueIncludedInEvidenceCount"),
    credentialValueIncludedCount: maxSummary(summaries, "credentialValueIncludedCount"),
    forbiddenDocumentTextMarkerCount: maxSummary(summaries, "forbiddenDocumentTextMarkerCount"),
    pathExposureCount: maxSummary(summaries, "pathExposureCount"),
    sourcesContentPolicy: summaries.every((summary) => summary?.sourcesContentPolicy === undefined || summary?.sourcesContentPolicy === "none") ? "none" : "mixed"
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

function renderCloseoutSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P42 Closeout And W-P43 Inputs

## Summary

- status: \`${evidence.status}\`
- input evidence: ${summary.readyInputEvidenceCount} / ${summary.inputEvidenceCount} ready
- completed phases: ${summary.completedPhaseCount}
- W-P43 inputs: ${summary.readyWp43InputCount} / ${summary.wp43InputCount} ready
- deferred gates: ${summary.deferredGateCount}
- checked apply write enabled: ${summary.checkedApplyWriteEnabled}
- workspace write / target mutation / checked apply trigger / direct edit: ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.checkedApplyTriggeredCount} / ${summary.directEditObjectCount}

## Next Stage

W-P43 should start from these host-owned apply UX inputs without enabling write authority by default.
`;
}

function renderWp43Inputs(wp43Inputs) {
  return `# W-P43 Host UX Inputs

${wp43Inputs.map((item) => `- ${item.topic}: ${item.description}`).join("\n")}
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
