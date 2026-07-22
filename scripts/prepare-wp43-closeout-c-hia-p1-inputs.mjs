import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp43-closeout-c-hia-p1-inputs");
const evidencePath = path.join(outputRoot, "evidence.json");
const closeoutSummaryPath = path.join(outputRoot, "wp43-closeout-summary.md");
const cycleGroupInputsPath = path.join(outputRoot, "c-hia-p1-closeout-inputs.md");
const deferredGateRegisterPath = path.join(outputRoot, "deferred-gate-register.md");
const inputEvidencePaths = {
  wp39Closeout: path.join(rootDir, "dist", "wp39-closeout-wp40-inputs", "evidence.json"),
  wp40Closeout: path.join(rootDir, "dist", "wp40-closeout-wp41-wp42-inputs", "evidence.json"),
  wp41Closeout: path.join(rootDir, "dist", "wp41-closeout-wp42-wp43-inputs", "evidence.json"),
  wp42Closeout: path.join(rootDir, "dist", "wp42-closeout-wp43-inputs", "evidence.json"),
  wp43HostUxIntake: path.join(rootDir, "dist", "wp43-host-ux-intake", "evidence.json"),
  wp43VscodeSurface: path.join(rootDir, "dist", "wp43-vscode-host-ux-surface", "evidence.json"),
  wp43HostProjection: path.join(rootDir, "dist", "wp43-devtools-visual-studio-ux-projection", "evidence.json"),
  wp43ProviderPanel: path.join(rootDir, "dist", "wp43-provider-review-linkage-panel", "evidence.json"),
  wp43TargetOwnerView: path.join(rootDir, "dist", "wp43-target-owner-evidence-view", "evidence.json"),
  wp43ManualPackets: path.join(rootDir, "dist", "wp43-host-confirmation-manual-packet", "evidence.json")
};

await main();

/**
 * 准备 W-P43.7 closeout and C-HIA-P1 input evidence。
 * Prepare W-P43.7 closeout and C-HIA-P1 input evidence.
 *
 * This closeout summarizes W-P43.1-W-P43.6 and the C-HIA-P1 upstream
 * closeouts into public-safe cycle-group closeout inputs. It records what is
 * ready as contract/evidence and what remains a deferred manual/runtime gate.
 * It does not launch hosts, run providers or target commands, create target
 * branches/PRs/sandboxes, enable checked-apply writes or expose private source
 * material.
 *
 * 中文：本阶段将 W-P43.1-W-P43.6 与 C-HIA-P1 上游收口证据汇总为公开安全的周期组
 * 收口输入。它记录 contract/evidence 已完成项与仍后延的人工/runtime gate，不启动宿主、
 * 不执行 provider 或目标命令、不创建目标 branch/PR/sandbox、不启用 checked apply 写入，
 * 也不暴露私有源码材料。
 *
 * @returns {Promise<void>} Writes public-safe W-P43 closeout and C-HIA-P1 input evidence.
 */
async function main() {
  const inputs = await readInputs(inputEvidencePaths);
  const completedCapabilities = createCompletedCapabilities(inputs);
  const deferredGates = createDeferredGates();
  const cycleGroupCloseoutInputs = createCycleGroupCloseoutInputs();
  const summary = summarize(inputs, completedCapabilities, deferredGates, cycleGroupCloseoutInputs);
  const checks = [
    check("HIA_WP43_CLOSEOUT_INPUTS_READY", summary.inputEvidenceCount === 10
      && summary.readyInputEvidenceCount === 10
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP43_CLOSEOUT_PHASES_COMPLETE", summary.cyclePhaseCount === 5
      && summary.wp43CompletedStageCount === 6
      && summary.completedCapabilityCount >= 6
      && summary.cycleGroupCloseoutInputCount >= 7
      && summary.deferredGateCount >= 8, {
      actual: {
        completedCapabilityCount: summary.completedCapabilityCount,
        cycleGroupCloseoutInputCount: summary.cycleGroupCloseoutInputCount,
        cyclePhaseCount: summary.cyclePhaseCount,
        deferredGateCount: summary.deferredGateCount,
        wp43CompletedStageCount: summary.wp43CompletedStageCount
      }
    }),
    check("HIA_WP43_CLOSEOUT_NO_EXECUTION_OR_WRITE", summary.actualRuntimeCaptureExecutedCount === 0
      && summary.realRemoteProviderInvocationExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.targetCommandsExecutedByHiaCount === 0
      && summary.targetOwnerExecutionClaimedCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0
      && summary.hostEditorApiCallCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecutedCount: summary.externalNetworkCallExecutedCount,
        hostEditorApiCallCount: summary.hostEditorApiCallCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        realRemoteProviderInvocationExecutedCount: summary.realRemoteProviderInvocationExecutedCount,
        targetCommandsExecutedByHiaCount: summary.targetCommandsExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: summary.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP43_CLOSEOUT_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
      && summary.sourceBodyIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.documentContentIncludedCount === 0
      && summary.digestValueIncludedCount === 0
      && summary.credentialValueIncludedCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        digestValueIncludedCount: summary.digestValueIncludedCount,
        documentContentIncludedCount: summary.documentContentIncludedCount,
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedCount: summary.sourceBodyIncludedCount,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    }),
    check("HIA_WP43_CLOSEOUT_CYCLE_GROUP_READY", summary.readyForCycleGroupCloseout === true
      && cycleGroupCloseoutInputs.some((item) => item.topic === "cycle-group-closeout-document")
      && cycleGroupCloseoutInputs.some((item) => item.topic === "deferred-gate-register")
      && cycleGroupCloseoutInputs.some((item) => item.topic === "next-cycle-planning-inputs"), {
      actual: {
        readyForCycleGroupCloseout: summary.readyForCycleGroupCloseout,
        topics: cycleGroupCloseoutInputs.map((item) => item.topic)
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp43-closeout-c-hia-p1-inputs-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-c-hia-p1-closeout-and-next-cycle-planning" : "blocked",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputEvidencePaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    closeout: {
      cycleGroupId: "C-HIA-P1",
      phase: "W-P43",
      closeoutStatus: "completed-first-round",
      downstreamPhase: "C-HIA-P1-closeout",
      checkedApplyWriteEnabledByCloseout: false,
      sourcesContentPolicy: "none"
    },
    completedCapabilities,
    deferredGates,
    cycleGroupCloseoutInputs,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      closeoutSummary: normalizePath(closeoutSummaryPath),
      cycleGroupInputs: normalizePath(cycleGroupInputsPath),
      deferredGateRegister: normalizePath(deferredGateRegisterPath)
    },
    manualChecks: [
      "Confirm C-HIA-P1 closeout keeps runtime/provider/target-owner/checked-apply gates separated from completed contract evidence.",
      "Confirm W-P43 closeout does not claim real host runtime capture or target-owner execution.",
      "Confirm next cycle planning starts from deferred gates rather than rewriting previous evidence.",
      "Confirm public evidence remains metadata-only and source-content-free."
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P43 closeout C-HIA-P1 input evidence");
  assert.equal(hardFailures.length, 0, `W-P43 closeout has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(closeoutSummaryPath, renderCloseoutSummary(evidence), "utf8");
  await writeFile(cycleGroupInputsPath, renderCycleGroupInputs(evidence), "utf8");
  await writeFile(deferredGateRegisterPath, renderDeferredGateRegister(evidence), "utf8");
  console.log(`W-P43 closeout C-HIA-P1 input evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P43 closeout summary prepared at ${normalizePath(closeoutSummaryPath)}`);
  console.log(`C-HIA-P1 closeout inputs prepared at ${normalizePath(cycleGroupInputsPath)}`);
}

async function readInputs(paths) {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, value]) => [key, await readJson(value)])
  );
  return Object.fromEntries(entries);
}

function createCompletedCapabilities(inputs) {
  return [
    capability("W-P43.1", "host-ux-intake", inputs.wp43HostUxIntake.status, "ready-for-wp43-host-surface-contract"),
    capability("W-P43.2", "vscode-host-ux-surface", inputs.wp43VscodeSurface.status, "ready-for-wp43-devtools-visual-studio-ux-projection"),
    capability("W-P43.3", "devtools-visual-studio-ux-projection", inputs.wp43HostProjection.status, "ready-for-wp43-provider-review-linkage-panel"),
    capability("W-P43.4", "provider-review-linkage-panel", inputs.wp43ProviderPanel.status, "ready-for-wp43-target-owner-evidence-view-and-deferred-gates"),
    capability("W-P43.5", "target-owner-evidence-view", inputs.wp43TargetOwnerView.status, "ready-for-wp43-host-confirmation-manual-packet-refresh"),
    capability("W-P43.6", "host-confirmation-manual-packet", inputs.wp43ManualPackets.status, "ready-for-wp43-closeout-and-c-hia-p1-inputs")
  ];
}

function capability(phase, topic, actualStatus, readyStatus) {
  return {
    phase,
    topic,
    status: actualStatus === readyStatus ? "completed-first-round" : "blocked",
    actualStatus,
    readyStatus,
    writeAuthorityGranted: false,
    targetRepositoryMutationAllowed: false
  };
}

function createDeferredGates() {
  return [
    deferred("real-vscode-runtime-capture", "Manual Extension Development Host capture remains separate from generated packet evidence."),
    deferred("real-devtools-runtime-capture", "Manual Chrome DevTools unpacked-extension capture remains separate from generated packet evidence."),
    deferred("real-visual-studio-runtime-capture", "Visual Studio runtime/VSIX route remains pending later host implementation and license audit."),
    deferred("controlled-remote-provider-execution", "Real provider/network execution remains blocked until concrete provider, destination, secret reference and final consent exist."),
    deferred("target-owner-command-execution", "Target project commands, sandbox, branch and PR must be run by target owner, not HIA automation."),
    deferred("checked-apply-write", "Checked apply write authority remains disabled until a later host-owned final confirmation and rollback/audit gate."),
    deferred("target-repository-mutation", "HIA automation still must not mutate target repositories."),
    deferred("source-content-sharing", "Public evidence must stay metadata-only unless a later explicit source privacy policy grants bounded opt-in.")
  ];
}

function deferred(id, reason) {
  return {
    id,
    reason,
    status: "deferred-explicitly"
  };
}

function createCycleGroupCloseoutInputs() {
  return [
    cycleInput("cycle-group-closeout-document", "Create the human-readable C-HIA-P1 closeout document from W-P39-W-P43 evidence."),
    cycleInput("deferred-gate-register", "Carry real host runtime capture, provider execution, target-owner execution and checked-apply write gates forward explicitly."),
    cycleInput("next-cycle-planning-inputs", "Prepare the next cycle from completed contract evidence and deferred gates without rewriting prior evidence."),
    cycleInput("host-manual-confirmation-board", "Use W-P43.6 packets as the manual confirmation board for VS Code, DevTools and Visual Studio."),
    cycleInput("provider-execution-readiness-review", "Treat W-P40 blocked/refused provider shape as governance input, not as provider success."),
    cycleInput("target-owner-evidence-ingestion", "Allow future target-owner supplied transcripts/results to be ingested as evidence after owner execution."),
    cycleInput("checked-apply-write-roadmap", "Start any future writable flow from host-owned confirmation, preflight, rollback, formatter and audit gates.")
  ];
}

function cycleInput(topic, description) {
  return {
    phase: "C-HIA-P1-closeout",
    topic,
    description,
    status: "ready-input",
    writeAuthorityGranted: false
  };
}

function summarize(inputs, completedCapabilities, deferredGates, cycleGroupCloseoutInputs) {
  const inputList = Object.values(inputs);
  const summaries = inputList.map((input) => input.summary || {});
  const expectedStatuses = {
    wp39Closeout: "ready-for-wp40-controlled-remote-provider-smoke-inputs",
    wp40Closeout: "ready-for-wp41-target-owner-branch-pr-smoke",
    wp41Closeout: "ready-for-wp42-checked-apply-hardening-and-wp43-host-ux-inputs",
    wp42Closeout: "ready-for-wp43-host-owned-apply-ux-inputs",
    wp43HostUxIntake: "ready-for-wp43-host-surface-contract",
    wp43VscodeSurface: "ready-for-wp43-devtools-visual-studio-ux-projection",
    wp43HostProjection: "ready-for-wp43-provider-review-linkage-panel",
    wp43ProviderPanel: "ready-for-wp43-target-owner-evidence-view-and-deferred-gates",
    wp43TargetOwnerView: "ready-for-wp43-host-confirmation-manual-packet-refresh",
    wp43ManualPackets: "ready-for-wp43-closeout-and-c-hia-p1-inputs"
  };
  const readyInputEvidenceCount = Object.entries(inputs)
    .filter(([key, evidence]) => evidence.status === expectedStatuses[key])
    .length;

  return {
    cycleGroupId: "C-HIA-P1",
    inputEvidenceCount: inputList.length,
    readyInputEvidenceCount,
    inputHardFailureCount: sumField(summaries, "hardFailureCount"),
    cyclePhaseCount: 5,
    wp43CompletedStageCount: completedCapabilities.filter((item) => item.status === "completed-first-round").length,
    completedCapabilityCount: completedCapabilities.length,
    deferredGateCount: deferredGates.length,
    cycleGroupCloseoutInputCount: cycleGroupCloseoutInputs.length,
    readyForCycleGroupCloseout: readyInputEvidenceCount === inputList.length,
    actualRuntimeCaptureExecutedCount: sumField(summaries, "actualRuntimeCaptureExecutedCount")
      + sumField(summaries, "actualRuntimeCaptureHostCount")
      + sumBool(summaries, "actualRuntimeCaptureExecuted"),
    realRemoteProviderInvocationExecutedCount: sumBool(summaries, "realRemoteProviderInvocationExecuted")
      + sumBool(summaries, "realRemoteInvocationExecuted"),
    externalNetworkCallExecutedCount: sumBool(summaries, "externalNetworkCallExecuted")
      + sumBool(summaries, "externalNetworkExecuted"),
    providerNetworkExecutedCount: sumField(summaries, "providerNetworkExecutedCount")
      + sumBool(summaries, "providerNetworkExecuted"),
    targetCommandsExecutedByHiaCount: sumField(summaries, "targetCommandExecutedByHiaCount")
      + sumField(summaries, "targetCommandsExecutedByHiaCount"),
    targetOwnerExecutionClaimedCount: sumField(summaries, "targetOwnerExecutionClaimedCount")
      + sumBool(summaries, "targetOwnerExecutionClaimed"),
    checkedApplyWriteEnabledCount: sumField(summaries, "checkedApplyWriteEnabledCount")
      + sumBool(summaries, "checkedApplyWriteEnabled"),
    checkedApplyTriggeredCount: sumField(summaries, "checkedApplyTriggeredCount")
      + sumBool(summaries, "checkedApplyTriggered"),
    workspaceWriteAllowedCount: sumField(summaries, "workspaceWriteAllowedCount")
      + sumBool(summaries, "workspaceWriteAllowed"),
    targetRepositoryMutationCount: sumField(summaries, "targetRepositoryMutationCount")
      + sumBool(summaries, "targetRepositoryMutationAllowed"),
    directEditObjectCount: sumField(summaries, "directEditObjectCount"),
    hostEditorApiCallCount: sumField(summaries, "hostEditorApiCallCount")
      + sumBool(summaries, "hostEditorApiCalled"),
    sourceBodyIncludedCount: sumBool(summaries, "sourceBodyIncludedInEvidence")
      + sumField(summaries, "sourceBodyIncludedCount"),
    sourceReferenceIncludedCount: sumField(summaries, "sourceReferenceIncludedCount"),
    sourceTextIncludedCount: sumField(summaries, "sourceTextIncludedCount"),
    documentContentIncludedCount: sumField(summaries, "documentContentIncludedInEvidenceCount")
      + sumField(summaries, "documentContentIncludedCount"),
    digestValueIncludedCount: sumField(summaries, "digestValueIncludedInEvidenceCount")
      + sumField(summaries, "digestValueIncludedCount"),
    credentialValueIncludedCount: sumField(summaries, "credentialValueIncludedCount"),
    pathExposureCount: sumField(summaries, "pathExposureCount"),
    sourcesContentPolicy: summaries.every((summary) => (summary.sourcesContentPolicy ?? "none") === "none") ? "none" : "mixed"
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sumField(items, field) {
  return items.reduce((sum, item) => sum + number(item?.[field]), 0);
}

function sumBool(items, field) {
  return items.reduce((sum, item) => sum + (item?.[field] === true ? 1 : 0), 0);
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

function renderCloseoutSummary(evidence) {
  const summary = evidence.summary;
  return `# W-P43.7 Closeout And C-HIA-P1 Inputs

## Summary

- status: \`${evidence.status}\`
- cycle group: \`${summary.cycleGroupId}\`
- input evidence ready: ${summary.readyInputEvidenceCount} / ${summary.inputEvidenceCount}
- W-P43 completed stages: ${summary.wp43CompletedStageCount} / 6
- completed capabilities: ${summary.completedCapabilityCount}
- deferred gates: ${summary.deferredGateCount}
- cycle group closeout inputs: ${summary.cycleGroupCloseoutInputCount}
- runtime/provider/network/target-owner execution: ${summary.actualRuntimeCaptureExecutedCount} / ${summary.providerNetworkExecutedCount} / ${summary.externalNetworkCallExecutedCount} / ${summary.targetOwnerExecutionClaimedCount}
- checked apply/write/target mutation/direct edit: ${summary.checkedApplyTriggeredCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.directEditObjectCount}
- sourcesContent policy: ${summary.sourcesContentPolicy}

## Boundary

This closeout prepares C-HIA-P1 closeout inputs only. It does not convert deferred runtime, provider, target-owner or checked-apply gates into completed work.
`;
}

function renderCycleGroupInputs(evidence) {
  return `# C-HIA-P1 Closeout Inputs

Source closeout: \`${evidence.contract}@${evidence.contractVersion}\`

${evidence.cycleGroupCloseoutInputs.map((item) => `- ${item.topic}: ${item.description}`).join("\n")}
`;
}

function renderDeferredGateRegister(evidence) {
  return `# Deferred Gate Register

${evidence.deferredGates.map((gate) => `- ${gate.id}: ${gate.reason}`).join("\n")}
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
