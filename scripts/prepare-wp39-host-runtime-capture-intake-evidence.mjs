import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp39-host-runtime-capture-intake");
const evidencePath = path.join(outputRoot, "evidence.json");
const runbookPath = path.join(outputRoot, "manual-runtime-capture-runbook.md");
const closeoutPath = path.join(rootDir, "dist", "wp38-closeout-next-inputs", "evidence.json");
const vscodeGuiPath = path.join(rootDir, "dist", "wp38-vscode-real-gui-confirmation-evidence", "evidence.json");
const hostParityPath = path.join(rootDir, "dist", "wp38-devtools-visual-studio-confirmation-parity", "evidence.json");
const remoteGatePath = path.join(rootDir, "dist", "wp38-remote-provider-smoke-gate-preparation", "evidence.json");
const targetFlowPath = path.join(rootDir, "dist", "wp38-target-branch-pr-flow-contract", "evidence.json");

await main();

/**
 * 准备 W-P39.1 host runtime capture intake evidence。
 * Prepare W-P39.1 host runtime capture intake evidence.
 *
 * This script converts the W-P38 closeout into the first W-P39 intake packet.
 * It plans real host runtime captures for VS Code, Chrome DevTools and Visual
 * Studio without driving those hosts or claiming a manual capture as complete.
 *
 * 中文：本脚本把 W-P38 收口证据转化为 W-P39 的第一份 intake packet。它为
 * VS Code、Chrome DevTools 和 Visual Studio 规划真实宿主 runtime capture，
 * 但不操控这些宿主，也不把手工采集误标为已完成。
 *
 * @returns {Promise<void>} Writes public-safe evidence and a manual runbook.
 */
async function main() {
  const closeout = await readJson(closeoutPath);
  const vscodeGui = await readJson(vscodeGuiPath);
  const hostParity = await readJson(hostParityPath);
  const remoteGate = await readJson(remoteGatePath);
  const targetFlow = await readJson(targetFlowPath);
  const cycleGroup = createCycleGroupMapping();
  const hostCapturePlan = createHostCapturePlan(vscodeGui, hostParity);
  const nextGatePlan = createNextGatePlan(closeout, remoteGate, targetFlow);
  const summary = {
    closeoutReady: closeout.status === "ready-for-next-cycle-planning",
    closeoutHardFailureCount: Number(closeout.summary?.hardFailureCount ?? -1),
    closeoutNextCycleInputCount: Number(closeout.summary?.nextCycleInputCount ?? 0),
    closeoutDeferredManualGateCount: Number(closeout.summary?.deferredManualGateCount ?? 0),
    cycleGroupId: cycleGroup.id,
    cycleGroupWPlanCount: cycleGroup.wPlan.length,
    hostCapturePlanCount: hostCapturePlan.length,
    manualCaptureReadyHostCount: hostCapturePlan.filter((host) => host.status === "manual-capture-ready").length,
    runtimePrepRequiredHostCount: hostCapturePlan.filter((host) => host.status === "runtime-prep-required").length,
    actualRuntimeCaptureHostCount: hostCapturePlan.filter((host) => host.actualRuntimeCaptureExecuted === true).length,
    checkedApplyAvailableHostCount: hostCapturePlan.filter((host) => host.checkedApplyAvailable === true).length,
    workspaceWriteAvailableHostCount: hostCapturePlan.filter((host) => host.workspaceWriteAllowed === true).length,
    targetRepositoryMutationAllowedHostCount: hostCapturePlan.filter((host) => host.targetRepositoryMutationAllowed === true).length,
    remoteProviderGateReady: remoteGate.smokeGateStatus === "prepared-manual-approval-required",
    remoteProviderInvocationExecuted: remoteGate.summary?.realRemoteProviderInvocationExecuted === true,
    externalNetworkCallExecuted: remoteGate.summary?.externalNetworkCallExecuted === true,
    targetFlowReady: targetFlow.status === "ready-for-devtools-visual-studio-confirmation-parity",
    actualTargetBranchCreated: targetFlow.summary?.actualTargetBranchCreated === true,
    actualPullRequestCreated: targetFlow.summary?.actualPullRequestCreated === true,
    nextGateCount: nextGatePlan.length,
    nextGateReadyCount: nextGatePlan.filter((gate) => gate.status === "ready-for-next-wp").length,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({ cycleGroup, hostCapturePlan, nextGatePlan }),
    sourceBodyIncludedInEvidence: false,
    sourcesContentPolicy: "none",
    pathExposureCount: countPathExposureValues({ cycleGroup, hostCapturePlan, nextGatePlan })
  };
  const checks = [
    check("HIA_WP39_INTAKE_CLOSEOUT_READY", summary.closeoutReady === true
      && summary.closeoutHardFailureCount === 0
      && summary.closeoutNextCycleInputCount >= 6
      && summary.closeoutDeferredManualGateCount >= 6, {
      actual: {
        closeoutDeferredManualGateCount: summary.closeoutDeferredManualGateCount,
        closeoutHardFailureCount: summary.closeoutHardFailureCount,
        closeoutNextCycleInputCount: summary.closeoutNextCycleInputCount,
        closeoutStatus: closeout.status
      }
    }),
    check("HIA_WP39_INTAKE_CYCLE_GROUP_MAPPED", summary.cycleGroupId === "C-HIA-P1"
      && summary.cycleGroupWPlanCount === 5
      && cycleGroup.wPlan.some((item) => item.id === "W-P39")
      && cycleGroup.wPlan.some((item) => item.id === "W-P43"), {
      actual: cycleGroup
    }),
    check("HIA_WP39_INTAKE_HOST_CAPTURE_PLAN_READY", summary.hostCapturePlanCount === 3
      && summary.manualCaptureReadyHostCount >= 2
      && summary.runtimePrepRequiredHostCount >= 1
      && hostCapturePlan.some((host) => host.host === "vscode-extension-development-host")
      && hostCapturePlan.some((host) => host.host === "chrome-devtools-unpacked-extension")
      && hostCapturePlan.some((host) => host.host === "visual-studio-extension-skeleton"), {
      actual: hostCapturePlan.map(({ host, status }) => ({ host, status }))
    }),
    check("HIA_WP39_INTAKE_MANUAL_GATES_NOT_CLAIMED", summary.actualRuntimeCaptureHostCount === 0
      && summary.remoteProviderInvocationExecuted === false
      && summary.externalNetworkCallExecuted === false
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestCreated === false, {
      actual: {
        actualPullRequestCreated: summary.actualPullRequestCreated,
        actualRuntimeCaptureHostCount: summary.actualRuntimeCaptureHostCount,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        remoteProviderInvocationExecuted: summary.remoteProviderInvocationExecuted
      }
    }),
    check("HIA_WP39_INTAKE_NEXT_GATES_READY", summary.remoteProviderGateReady === true
      && summary.targetFlowReady === true
      && summary.nextGateCount === 3
      && summary.nextGateReadyCount === 3, {
      actual: {
        nextGatePlan,
        remoteProviderGateReady: summary.remoteProviderGateReady,
        targetFlowReady: summary.targetFlowReady
      }
    }),
    check("HIA_WP39_INTAKE_NO_WRITE_AUTHORITY", summary.checkedApplyAvailableHostCount === 0
      && summary.workspaceWriteAvailableHostCount === 0
      && summary.targetRepositoryMutationAllowedHostCount === 0
      && summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyAvailableHostCount: summary.checkedApplyAvailableHostCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationAllowedHostCount: summary.targetRepositoryMutationAllowedHostCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount,
        workspaceWriteAvailableHostCount: summary.workspaceWriteAvailableHostCount
      }
    }),
    check("HIA_WP39_INTAKE_PRIVACY_CLEAN", summary.pathExposureCount === 0
      && summary.sourceBodyIncludedInEvidence === false
      && summary.sourcesContentPolicy === "none", {
      actual: {
        pathExposureCount: summary.pathExposureCount,
        sourceBodyIncludedInEvidence: summary.sourceBodyIncludedInEvidence,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp39-host-runtime-capture-intake-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp39-host-runtime-capture-baseline" : "blocked",
    sourceEvidence: {
      wp38Closeout: normalizePath(closeoutPath),
      vscodeGuiPreparation: normalizePath(vscodeGuiPath),
      hostParity: normalizePath(hostParityPath),
      remoteProviderSmokeGate: normalizePath(remoteGatePath),
      targetBranchPrFlow: normalizePath(targetFlowPath)
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    cycleGroup,
    hostCapturePlan,
    nextGatePlan,
    checks,
    manualRunbook: normalizePath(runbookPath),
    nextContractInputs: [
      {
        phase: "W-P39.2",
        topic: "vscode-extension-development-host-capture",
        reason: "VS Code is the most mature host surface and should provide the first real runtime capture packet."
      },
      {
        phase: "W-P39.3",
        topic: "chrome-devtools-unpacked-runtime-capture",
        reason: "DevTools has a native panel shell and should prove the zero-permission runtime handoff in a real browser."
      },
      {
        phase: "W-P39.4",
        topic: "visual-studio-runtime-capture-preparation",
        reason: "Visual Studio needs VSIX/runtime preparation before it can produce true capture evidence."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P39 host runtime capture intake evidence");
  assert.equal(hardFailures.length, 0, `W-P39 intake evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(runbookPath, createManualRunbook(evidence), "utf8");
  console.log(`W-P39 host runtime capture intake evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Manual runtime capture runbook prepared at ${normalizePath(runbookPath)}`);
}

function createCycleGroupMapping() {
  return {
    id: "C-HIA-P1",
    name: "Host Runtime And Controlled Adoption Cycle Group",
    status: "started",
    role: "First formal cycle-group blueprint for the post-W-P38 runtime, provider and adoption hardening sequence.",
    wPlan: [
      {
        id: "W-P39",
        focus: "real-host-runtime-capture-baseline",
        exitEvidence: "host capture packets prepared or completed without write authority"
      },
      {
        id: "W-P40",
        focus: "controlled-remote-provider-smoke",
        exitEvidence: "remote provider smoke can be executed only after explicit host-mediated gates"
      },
      {
        id: "W-P41",
        focus: "target-owner-branch-pr-smoke",
        exitEvidence: "target owners have repeatable sandbox or branch/PR adoption packets"
      },
      {
        id: "W-P42",
        focus: "checked-apply-contract-hardening",
        exitEvidence: "apply contracts are hardened with conflict, rollback, audit and review linkage checks"
      },
      {
        id: "W-P43",
        focus: "host-owned-apply-ux-and-provider-review-linkage",
        exitEvidence: "host review surfaces can connect provider results to checked apply previews under human control"
      }
    ]
  };
}

function createHostCapturePlan(vscodeGui, hostParity) {
  const vscodeRunbook = vscodeGui.vscodeHostRunbook ?? {};
  const parityHosts = Array.isArray(hostParity.hostParity) ? hostParity.hostParity : [];
  const devtoolsParity = parityHosts.find((host) => host.host === "devtools") ?? {};
  const visualStudioParity = parityHosts.find((host) => host.host === "visual-studio") ?? {};

  return [
    {
      host: "vscode-extension-development-host",
      status: "manual-capture-ready",
      sourceInput: "W-P38.2",
      commandTitle: vscodeRunbook.commandTitle ?? "HIA: Show Checked Apply Sandbox Confirmation",
      commandId: vscodeRunbook.commandId ?? "hia.showCheckedApplySandboxConfirmation",
      launchCommandTemplate: vscodeRunbook.launchCommandTemplate ?? "code --extensionDevelopmentPath <main-repo>/apps/vscode-extension <main-repo>",
      requiredCaptureMarkers: [
        "command palette command is visible",
        "two sandbox transaction choices are visible",
        "HIA output channel shows final confirmation and disabled write authority"
      ],
      checkedApplyAvailable: false,
      workspaceWriteAllowed: false,
      targetRepositoryMutationAllowed: false,
      actualRuntimeCaptureExecuted: false
    },
    {
      host: "chrome-devtools-unpacked-extension",
      status: devtoolsParity.status === "input-ready" ? "manual-capture-ready" : "blocked",
      sourceInput: "W-P38.6",
      appDirectory: "apps/devtools-extension",
      runtimeEntry: "Chrome DevTools > HIA panel",
      requiredCaptureMarkers: [
        "unpacked extension loads without host permissions",
        "HIA panel renders relation and review payload summaries",
        "inspected page bridge dispatches a structured open request event without returning page data"
      ],
      checkedApplyAvailable: devtoolsParity.checkedApplyAvailable === true,
      workspaceWriteAllowed: devtoolsParity.workspaceWriteAvailable === true,
      targetRepositoryMutationAllowed: devtoolsParity.targetRepositoryMutationAllowed === true,
      actualRuntimeCaptureExecuted: false
    },
    {
      host: "visual-studio-extension-skeleton",
      status: visualStudioParity.status === "input-ready" ? "runtime-prep-required" : "blocked",
      sourceInput: "W-P38.6",
      appDirectory: "apps/visual-studio-extension",
      runtimeEntry: "Visual Studio tool window candidate",
      requiredCaptureMarkers: [
        "VSIX or experimental instance route exists",
        "tool window can consume review-surface input",
        "checked apply remains unavailable until host-owned apply gate is explicitly enabled"
      ],
      checkedApplyAvailable: visualStudioParity.checkedApplyAvailable === true,
      workspaceWriteAllowed: visualStudioParity.workspaceWriteAvailable === true,
      targetRepositoryMutationAllowed: visualStudioParity.targetRepositoryMutationAllowed === true,
      actualRuntimeCaptureExecuted: false
    }
  ];
}

function createNextGatePlan(closeout, remoteGate, targetFlow) {
  const closeoutTopics = Array.isArray(closeout.nextCycleInputs)
    ? closeout.nextCycleInputs.map((input) => input.topic)
    : [];

  return [
    {
      id: "controlled-remote-provider-smoke",
      status: remoteGate.smokeGateStatus === "prepared-manual-approval-required"
        && closeoutTopics.includes("controlled-remote-provider-smoke")
        ? "ready-for-next-wp"
        : "blocked",
      nextWp: "W-P40",
      requiredBeforeExecution: [
        "credential reference selected by host",
        "destination allowlist confirmed",
        "provider, workspace and request consent recorded",
        "source policy remains none unless explicitly changed"
      ]
    },
    {
      id: "target-owner-branch-pr-smoke",
      status: targetFlow.status === "ready-for-devtools-visual-studio-confirmation-parity"
        && closeoutTopics.includes("target-owner-branch-pr-smoke")
        ? "ready-for-next-wp"
        : "blocked",
      nextWp: "W-P41",
      requiredBeforeExecution: [
        "target owner creates local sandbox or branch",
        "HIA automation does not push or mutate target repositories",
        "central notify remains pull-based"
      ]
    },
    {
      id: "checked-apply-review-linkage",
      status: closeoutTopics.includes("checked-apply-contract-hardening")
        && closeoutTopics.includes("host-owned-apply-ux-polish")
        && closeoutTopics.includes("provider-result-to-checked-apply-review-linkage")
        ? "ready-for-next-wp"
        : "blocked",
      nextWp: "W-P42/W-P43",
      requiredBeforeExecution: [
        "provider result remains review augmentation",
        "host owns final apply transaction",
        "human confirmation and rollback audit stay mandatory"
      ]
    }
  ];
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Missing or invalid W-P39 input evidence at ${normalizePath(filePath)}. Run the W-P38 evidence chain first. ${error.message}`);
  }
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

function countDirectEditObjects(value) {
  return countMatchingValues(value, /workspaceEdit|documentChanges|TextEdit\[/iu);
}

function countPathExposureValues(value) {
  return countMatchingValues(value, /[A-Za-z]:[\\/]|file:\/\/|\\\\[^\\/]+[\\/][^\\/]+/u);
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

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      visitValues(item, visitor);
    }
  }
}

function assertNoPrivateMarkers(serialized, label) {
  assert.doesNotMatch(serialized, /[A-Za-z]:[\\/]/u, `${label} must not expose absolute Windows paths.`);
  assert.doesNotMatch(serialized, /file:\/\//u, `${label} must not expose file URLs.`);
  assert.doesNotMatch(serialized, /work-zone/u, `${label} must not expose private WorkZone paths.`);
}

function createManualRunbook(evidence) {
  const lines = [
    "# W-P39 Host Runtime Capture Manual Runbook",
    "",
    "This runbook is generated from public-safe evidence. It does not mark any runtime capture as complete.",
    "",
    "## Cycle Group",
    "",
    `- Cycle group: \`${evidence.cycleGroup.id}\``,
    `- W plan: ${evidence.cycleGroup.wPlan.map((item) => item.id).join(", ")}`,
    "",
    "## Hosts",
    ""
  ];

  for (const host of evidence.hostCapturePlan) {
    lines.push(`### ${host.host}`);
    lines.push("");
    lines.push(`- Status: \`${host.status}\``);
    lines.push(`- Source input: \`${host.sourceInput}\``);

    if (host.launchCommandTemplate) {
      lines.push(`- Launch command template: \`${host.launchCommandTemplate}\``);
    }

    if (host.appDirectory) {
      lines.push(`- App directory: \`${host.appDirectory}\``);
    }

    if (host.runtimeEntry) {
      lines.push(`- Runtime entry: ${host.runtimeEntry}`);
    }

    lines.push("- Required capture markers:");

    for (const marker of host.requiredCaptureMarkers) {
      lines.push(`  - ${marker}`);
    }

    lines.push("- Write authority remains disabled for this capture.");
    lines.push("");
  }

  lines.push("## Next Gates");
  lines.push("");

  for (const gate of evidence.nextGatePlan) {
    lines.push(`- \`${gate.id}\` -> \`${gate.nextWp}\`: \`${gate.status}\``);
  }

  lines.push("");
  lines.push("## Completion Rule");
  lines.push("");
  lines.push("A host runtime capture is complete only after a human records visible runtime evidence and the follow-up evidence file explicitly changes that host from planned to captured.");
  return `${lines.join("\n")}\n`;
}
