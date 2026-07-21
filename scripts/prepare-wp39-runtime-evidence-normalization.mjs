import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp39-runtime-evidence-normalization");
const evidencePath = path.join(outputRoot, "evidence.json");
const schemaPath = path.join(outputRoot, "normalized-runtime-evidence-schema.md");
const matrixPath = path.join(outputRoot, "runtime-evidence-status-matrix.md");
const intakePath = path.join(rootDir, "dist", "wp39-host-runtime-capture-intake", "evidence.json");
const vscodePacketPath = path.join(rootDir, "dist", "wp39-vscode-runtime-capture-packet", "evidence.json");
const devtoolsPacketPath = path.join(rootDir, "dist", "wp39-devtools-runtime-capture-packet", "evidence.json");
const visualStudioPrepPath = path.join(rootDir, "dist", "wp39-visual-studio-runtime-preparation", "evidence.json");

await main();

/**
 * 生成 W-P39.5 runtime evidence normalization。
 * Generate W-P39.5 runtime evidence normalization.
 *
 * This script converts the three W-P39 host-specific packet shapes into one
 * normalized matrix. It keeps prepared/manual evidence separate from captured
 * evidence, so later W-P40/W-P41/W-P42 gates can consume a single contract
 * without accidentally treating preparation as runtime completion.
 *
 * 中文：本脚本把 W-P39 三类宿主专用 packet shape 规整为统一矩阵。它明确区分
 * prepared/manual evidence 与 captured evidence，避免后续 W-P40/W-P41/W-P42
 * 把准备态误认为真实 runtime 完成态。
 *
 * @returns {Promise<void>} Writes public-safe normalized evidence and docs.
 */
async function main() {
  const intake = await readJson(intakePath);
  const vscodePacket = await readJson(vscodePacketPath);
  const devtoolsPacket = await readJson(devtoolsPacketPath);
  const visualStudioPrep = await readJson(visualStudioPrepPath);
  const normalizedHosts = [
    normalizeManualCapturePacket({
      evidence: vscodePacket,
      evidencePath: vscodePacketPath,
      hostKind: "vscode",
      normalizedRuntimeState: "manual-capture-ready"
    }),
    normalizeManualCapturePacket({
      evidence: devtoolsPacket,
      evidencePath: devtoolsPacketPath,
      hostKind: "devtools",
      normalizedRuntimeState: "manual-capture-ready"
    }),
    normalizeVisualStudioPreparation({
      evidence: visualStudioPrep,
      evidencePath: visualStudioPrepPath
    })
  ];
  const normalizedSchema = createNormalizedSchema();
  const aggregate = summarize({ intake, normalizedHosts });
  const nextGateBridgeInput = createNextGateBridgeInput(normalizedHosts);
  const checks = [
    check("HIA_WP39_RUNTIME_NORMALIZATION_INPUTS_READY", intake.status === "ready-for-wp39-host-runtime-capture-baseline"
      && intake.summary?.cycleGroupId === "C-HIA-P1"
      && Number(intake.summary?.hardFailureCount ?? -1) === 0
      && vscodePacket.status === "ready-for-vscode-manual-runtime-capture"
      && devtoolsPacket.status === "ready-for-devtools-manual-runtime-capture"
      && visualStudioPrep.status === "ready-for-visual-studio-runtime-route-followup"
      && normalizedHosts.every((host) => host.inputHardFailureCount === 0), {
      actual: {
        cycleGroupId: intake.summary?.cycleGroupId,
        devtoolsStatus: devtoolsPacket.status,
        intakeHardFailureCount: intake.summary?.hardFailureCount,
        intakeStatus: intake.status,
        visualStudioStatus: visualStudioPrep.status,
        vscodeStatus: vscodePacket.status
      }
    }),
    check("HIA_WP39_RUNTIME_NORMALIZATION_MATRIX_COMPLETE", aggregate.hostCount === 3
      && aggregate.manualCaptureReadyCount === 2
      && aggregate.routePreparationReadyCount === 1
      && aggregate.normalizedStateCount === 2
      && normalizedHosts.some((host) => host.host === "vscode-extension-development-host")
      && normalizedHosts.some((host) => host.host === "chrome-devtools-unpacked-extension")
      && normalizedHosts.some((host) => host.host === "visual-studio-extension-skeleton"), {
      actual: {
        hostCount: aggregate.hostCount,
        manualCaptureReadyCount: aggregate.manualCaptureReadyCount,
        normalizedStates: aggregate.normalizedStates,
        routePreparationReadyCount: aggregate.routePreparationReadyCount
      }
    }),
    check("HIA_WP39_RUNTIME_NORMALIZATION_CAPTURE_NOT_CLAIMED", aggregate.actualRuntimeCaptureExecutedCount === 0
      && aggregate.captureCompletionClaimedCount === 0
      && aggregate.visualStudioPackageBuiltCount === 0
      && aggregate.visualStudioExperimentalInstanceExecutedCount === 0
      && aggregate.capturedHostCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: aggregate.actualRuntimeCaptureExecutedCount,
        capturedHostCount: aggregate.capturedHostCount,
        captureCompletionClaimedCount: aggregate.captureCompletionClaimedCount,
        visualStudioExperimentalInstanceExecutedCount: aggregate.visualStudioExperimentalInstanceExecutedCount,
        visualStudioPackageBuiltCount: aggregate.visualStudioPackageBuiltCount
      }
    }),
    check("HIA_WP39_RUNTIME_NORMALIZATION_MANUAL_MATERIAL_READY", aggregate.requiredScreenshotCount >= 7
      && aggregate.requiredTranscriptCount >= 2
      && aggregate.manualChecklistCount === 3
      && aggregate.captureReportTemplateCount >= 2
      && nextGateBridgeInput.requiredHostCount === 3, {
      actual: {
        captureReportTemplateCount: aggregate.captureReportTemplateCount,
        manualChecklistCount: aggregate.manualChecklistCount,
        requiredScreenshotCount: aggregate.requiredScreenshotCount,
        requiredTranscriptCount: aggregate.requiredTranscriptCount,
        requiredHostCount: nextGateBridgeInput.requiredHostCount
      }
    }),
    check("HIA_WP39_RUNTIME_NORMALIZATION_NO_WRITE_AUTHORITY", aggregate.checkedApplyAvailableCount === 0
      && aggregate.workspaceWriteAllowedCount === 0
      && aggregate.targetRepositoryMutationAllowedCount === 0
      && aggregate.providerOwnedApplyAllowedCount === 0
      && aggregate.lspServerOwnedApplyAllowedCount === 0
      && aggregate.directEditObjectCount === 0, {
      actual: {
        checkedApplyAvailableCount: aggregate.checkedApplyAvailableCount,
        directEditObjectCount: aggregate.directEditObjectCount,
        lspServerOwnedApplyAllowedCount: aggregate.lspServerOwnedApplyAllowedCount,
        providerOwnedApplyAllowedCount: aggregate.providerOwnedApplyAllowedCount,
        targetRepositoryMutationAllowedCount: aggregate.targetRepositoryMutationAllowedCount,
        workspaceWriteAllowedCount: aggregate.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP39_RUNTIME_NORMALIZATION_PRIVACY_CLEAN", aggregate.pathExposureCount === 0
      && aggregate.sourceBodyIncludedInEvidenceCount === 0
      && aggregate.sourcesContentPolicyNoneCount === 3, {
      actual: {
        pathExposureCount: aggregate.pathExposureCount,
        sourceBodyIncludedInEvidenceCount: aggregate.sourceBodyIncludedInEvidenceCount,
        sourcesContentPolicyNoneCount: aggregate.sourcesContentPolicyNoneCount
      }
    }),
    check("HIA_WP39_RUNTIME_NORMALIZATION_SCHEMA_READY", normalizedSchema.states.length >= 5
      && normalizedSchema.states.some((state) => state.id === "manual-capture-ready")
      && normalizedSchema.states.some((state) => state.id === "route-preparation-ready")
      && normalizedSchema.requiredFields.includes("normalizedRuntimeState")
      && normalizedSchema.requiredFields.includes("actualRuntimeCaptureExecuted"), {
      actual: {
        requiredFields: normalizedSchema.requiredFields,
        states: normalizedSchema.states.map((state) => state.id)
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp39-runtime-evidence-normalization",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp39-next-gate-bridge" : "blocked",
    sourceEvidence: {
      hostRuntimeCaptureIntake: normalizePath(intakePath),
      vscodeRuntimeCapturePacket: normalizePath(vscodePacketPath),
      devtoolsRuntimeCapturePacket: normalizePath(devtoolsPacketPath),
      visualStudioRuntimePreparation: normalizePath(visualStudioPrepPath)
    },
    summary: {
      ...aggregate,
      hardFailureCount: hardFailures.length
    },
    normalizedSchema,
    normalizedHosts,
    nextGateBridgeInput,
    generatedDocs: {
      normalizedSchema: normalizePath(schemaPath),
      runtimeEvidenceStatusMatrix: normalizePath(matrixPath)
    },
    checks,
    nextContractInputs: [
      {
        phase: "W-P39.6",
        topic: "next-gate-bridge",
        reason: "W-P40/W-P41/W-P42 should consume normalized host runtime states instead of host-specific packet shapes."
      },
      {
        phase: "W-P39/manual",
        topic: "manual-runtime-capture-archive",
        reason: "Future screenshots and transcripts must be recorded as captured evidence only after human runtime execution is actually performed."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P39 runtime evidence normalization");
  assert.equal(hardFailures.length, 0, `W-P39 runtime normalization has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(schemaPath, renderSchemaMarkdown(normalizedSchema), "utf8");
  await writeFile(matrixPath, renderMatrixMarkdown(normalizedHosts, aggregate), "utf8");
  console.log(`W-P39 runtime evidence normalization prepared at ${normalizePath(evidencePath)}`);
  console.log(`Normalized schema prepared at ${normalizePath(schemaPath)}`);
  console.log(`Runtime evidence status matrix prepared at ${normalizePath(matrixPath)}`);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read required JSON evidence at ${normalizePath(filePath)}: ${error.message}`);
  }
}

function normalizeManualCapturePacket({ evidence, evidencePath, hostKind, normalizedRuntimeState }) {
  const packet = evidence.packet ?? {};
  const captureArtifacts = Array.isArray(packet.captureArtifacts) ? packet.captureArtifacts : [];

  return {
    host: packet.host,
    hostKind,
    sourcePhase: "W-P39",
    sourceInput: packet.sourceInput,
    sourceEvidence: normalizePath(evidencePath),
    inputContract: evidence.contract,
    inputStatus: evidence.status,
    inputHardFailureCount: Number(evidence.summary?.hardFailureCount ?? 0),
    evidenceType: "manual-runtime-capture-packet",
    normalizedRuntimeState,
    captureState: "prepared-not-captured",
    packetStatus: packet.packetStatus,
    actualRuntimeCaptureExecuted: packet.actualRuntimeCaptureExecuted === true,
    captureCompletionClaimed: false,
    routePreparationRequired: false,
    routePreparationReady: false,
    manualEvidence: {
      requiredArtifactCount: captureArtifacts.length,
      requiredScreenshotCount: captureArtifacts.filter((artifact) => artifact.kind === "screenshot" && artifact.required === true).length,
      requiredTranscriptCount: captureArtifacts.filter((artifact) => artifact.kind === "transcript" && artifact.required === true).length,
      manualChecklist: packet.manualChecklist,
      captureReportTemplate: packet.captureReportTemplate
    },
    visualStudioRuntime: {
      packageBuilt: false,
      experimentalInstanceExecuted: false,
      vsixPublished: false
    },
    writeAuthority: {
      checkedApplyAvailable: packet.checkedApplyAvailable === true,
      workspaceWriteAllowed: packet.workspaceWriteAllowed === true,
      targetRepositoryMutationAllowed: packet.targetRepositoryMutationAllowed === true,
      providerOwnedApplyAllowed: packet.providerOwnedApplyAllowed === true,
      lspServerOwnedApplyAllowed: packet.lspServerOwnedApplyAllowed === true
    },
    privacy: {
      sourceBodyIncludedInEvidence: evidence.summary?.sourceBodyIncludedInEvidence === true,
      sourcesContentPolicy: packet.sourcesContentPolicy,
      pathExposureCount: Number(evidence.summary?.pathExposureCount ?? 0)
    }
  };
}

function normalizeVisualStudioPreparation({ evidence, evidencePath }) {
  const packet = evidence.preparationPacket ?? {};
  const routeDecision = evidence.routeDecision ?? {};

  return {
    host: packet.host,
    hostKind: "visual-studio",
    sourcePhase: "W-P39",
    sourceInput: packet.sourceInput,
    sourceEvidence: normalizePath(evidencePath),
    inputContract: evidence.contract,
    inputStatus: evidence.status,
    inputHardFailureCount: Number(evidence.summary?.hardFailureCount ?? 0),
    evidenceType: "runtime-route-preparation",
    normalizedRuntimeState: "route-preparation-ready",
    captureState: "implementation-required-before-capture",
    packetStatus: packet.packetStatus,
    actualRuntimeCaptureExecuted: packet.actualRuntimeCaptureExecuted === true,
    captureCompletionClaimed: false,
    routePreparationRequired: true,
    routePreparationReady: routeDecision.status === "route-selected-for-preparation",
    manualEvidence: {
      requiredArtifactCount: 0,
      requiredScreenshotCount: 0,
      requiredTranscriptCount: 0,
      manualChecklist: packet.manualChecklist,
      captureReportTemplate: null
    },
    routeDecision: {
      selectedNearTermRoute: routeDecision.selectedNearTermRoute,
      laterImplementationRoute: routeDecision.laterImplementationRoute,
      candidateCount: Array.isArray(routeDecision.candidates) ? routeDecision.candidates.length : 0,
      dependencyLicenseAuditRequiredCount: Array.isArray(routeDecision.candidates)
        ? routeDecision.candidates.filter((candidate) => candidate.dependencyLicenseAuditRequired === true).length
        : 0
    },
    visualStudioRuntime: {
      packageBuilt: packet.visualStudioExtensionPackageBuilt === true,
      experimentalInstanceExecuted: packet.experimentalInstanceExecuted === true,
      vsixPublished: packet.vsixPublished === true
    },
    writeAuthority: {
      checkedApplyAvailable: packet.checkedApplyAvailable === true,
      workspaceWriteAllowed: packet.workspaceWriteAllowed === true,
      targetRepositoryMutationAllowed: packet.targetRepositoryMutationAllowed === true,
      providerOwnedApplyAllowed: packet.providerOwnedApplyAllowed === true,
      lspServerOwnedApplyAllowed: packet.lspServerOwnedApplyAllowed === true
    },
    privacy: {
      sourceBodyIncludedInEvidence: evidence.summary?.sourceBodyIncludedInEvidence === true,
      sourcesContentPolicy: packet.sourcesContentPolicy,
      pathExposureCount: Number(evidence.summary?.pathExposureCount ?? 0)
    }
  };
}

function createNormalizedSchema() {
  return {
    contract: "hia-wp39-normalized-runtime-host-state",
    contractVersion: "0.1.0-draft",
    requiredFields: [
      "host",
      "hostKind",
      "sourcePhase",
      "sourceEvidence",
      "inputContract",
      "inputStatus",
      "evidenceType",
      "normalizedRuntimeState",
      "captureState",
      "actualRuntimeCaptureExecuted",
      "captureCompletionClaimed",
      "writeAuthority",
      "privacy"
    ],
    states: [
      {
        id: "manual-capture-ready",
        meaning: "Human runtime capture materials are prepared, but the host has not been executed by this evidence."
      },
      {
        id: "route-preparation-ready",
        meaning: "Runtime implementation route is selected and checklist-ready, but a host package must still be built before capture."
      },
      {
        id: "captured",
        meaning: "A real host runtime capture has been performed and archived under public-safe evidence rules."
      },
      {
        id: "blocked",
        meaning: "The host packet cannot proceed until a stated blocker is resolved."
      },
      {
        id: "not-applicable",
        meaning: "The host is outside the current capture scope."
      }
    ],
    captureCompletionRule: "Only normalizedRuntimeState=captured may set actualRuntimeCaptureExecuted=true or captureCompletionClaimed=true.",
    privacyRule: "Normalized evidence must not include source bodies, sourcesContent, absolute local paths, file URLs, credentials or private workspace paths.",
    writeAuthorityRule: "Runtime capture evidence does not grant checked apply, workspace write, provider-owned apply, LSP-owned apply or target repository mutation."
  };
}

function summarize({ intake, normalizedHosts }) {
  const normalizedStates = [...new Set(normalizedHosts.map((host) => host.normalizedRuntimeState))].sort();
  const manualCaptureReady = normalizedHosts.filter((host) => host.normalizedRuntimeState === "manual-capture-ready");
  const routePreparationReady = normalizedHosts.filter((host) => host.normalizedRuntimeState === "route-preparation-ready");

  return {
    cycleGroupId: intake.summary?.cycleGroupId,
    hostCount: normalizedHosts.length,
    normalizedStates,
    normalizedStateCount: normalizedStates.length,
    manualCaptureReadyCount: manualCaptureReady.length,
    routePreparationReadyCount: routePreparationReady.length,
    capturedHostCount: normalizedHosts.filter((host) => host.normalizedRuntimeState === "captured").length,
    actualRuntimeCaptureExecutedCount: normalizedHosts.filter((host) => host.actualRuntimeCaptureExecuted === true).length,
    captureCompletionClaimedCount: normalizedHosts.filter((host) => host.captureCompletionClaimed === true).length,
    visualStudioPackageBuiltCount: normalizedHosts.filter((host) => host.visualStudioRuntime?.packageBuilt === true).length,
    visualStudioExperimentalInstanceExecutedCount: normalizedHosts.filter((host) => host.visualStudioRuntime?.experimentalInstanceExecuted === true).length,
    requiredArtifactCount: sum(normalizedHosts, (host) => host.manualEvidence?.requiredArtifactCount),
    requiredScreenshotCount: sum(normalizedHosts, (host) => host.manualEvidence?.requiredScreenshotCount),
    requiredTranscriptCount: sum(normalizedHosts, (host) => host.manualEvidence?.requiredTranscriptCount),
    manualChecklistCount: normalizedHosts.filter((host) => Boolean(host.manualEvidence?.manualChecklist)).length,
    captureReportTemplateCount: normalizedHosts.filter((host) => Boolean(host.manualEvidence?.captureReportTemplate)).length,
    checkedApplyAvailableCount: normalizedHosts.filter((host) => host.writeAuthority?.checkedApplyAvailable === true).length,
    workspaceWriteAllowedCount: normalizedHosts.filter((host) => host.writeAuthority?.workspaceWriteAllowed === true).length,
    targetRepositoryMutationAllowedCount: normalizedHosts.filter((host) => host.writeAuthority?.targetRepositoryMutationAllowed === true).length,
    providerOwnedApplyAllowedCount: normalizedHosts.filter((host) => host.writeAuthority?.providerOwnedApplyAllowed === true).length,
    lspServerOwnedApplyAllowedCount: normalizedHosts.filter((host) => host.writeAuthority?.lspServerOwnedApplyAllowed === true).length,
    directEditObjectCount: countDirectEditObjects(normalizedHosts),
    pathExposureCount: sum(normalizedHosts, (host) => host.privacy?.pathExposureCount),
    sourceBodyIncludedInEvidenceCount: normalizedHosts.filter((host) => host.privacy?.sourceBodyIncludedInEvidence === true).length,
    sourcesContentPolicyNoneCount: normalizedHosts.filter((host) => host.privacy?.sourcesContentPolicy === "none").length
  };
}

function createNextGateBridgeInput(normalizedHosts) {
  return {
    contract: "hia-wp39-next-gate-bridge-input",
    contractVersion: "0.1.0-draft",
    requiredHostCount: 3,
    runtimeCompletionRequiredBeforeProviderSmoke: false,
    providerSmokeMayUseNormalizedStatesOnly: true,
    targetOwnerFlowMayUseNormalizedStatesOnly: true,
    checkedApplyHardeningMayUseNormalizedStatesOnly: true,
    hostStates: normalizedHosts.map((host) => ({
      host: host.host,
      hostKind: host.hostKind,
      normalizedRuntimeState: host.normalizedRuntimeState,
      actualRuntimeCaptureExecuted: host.actualRuntimeCaptureExecuted,
      captureCompletionClaimed: host.captureCompletionClaimed,
      writeAuthority: host.writeAuthority,
      privacy: host.privacy
    }))
  };
}

function sum(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) ?? 0), 0);
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

function renderSchemaMarkdown(schema) {
  const lines = [
    "# W-P39 Normalized Runtime Evidence Schema",
    "",
    `Contract: \`${schema.contract}@${schema.contractVersion}\``,
    "",
    "## Required Fields",
    ""
  ];

  for (const field of schema.requiredFields) {
    lines.push(`- \`${field}\``);
  }

  lines.push("");
  lines.push("## States");
  lines.push("");

  for (const state of schema.states) {
    lines.push(`- \`${state.id}\`: ${state.meaning}`);
  }

  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push(`- ${schema.captureCompletionRule}`);
  lines.push(`- ${schema.privacyRule}`);
  lines.push(`- ${schema.writeAuthorityRule}`);
  return `${lines.join("\n")}\n`;
}

function renderMatrixMarkdown(normalizedHosts, aggregate) {
  const lines = [
    "# W-P39 Runtime Evidence Status Matrix",
    "",
    `Host count: ${aggregate.hostCount}`,
    `Manual capture ready: ${aggregate.manualCaptureReadyCount}`,
    `Route preparation ready: ${aggregate.routePreparationReadyCount}`,
    `Actual runtime capture executed: ${aggregate.actualRuntimeCaptureExecutedCount}`,
    "",
    "| Host | Kind | State | Actual Capture | Write | Source Policy |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const host of normalizedHosts) {
    const writeDisabled = Object.values(host.writeAuthority).every((value) => value === false);
    lines.push(`| \`${host.host}\` | ${host.hostKind} | \`${host.normalizedRuntimeState}\` | ${host.actualRuntimeCaptureExecuted} | ${writeDisabled ? "disabled" : "enabled"} | \`${host.privacy.sourcesContentPolicy}\` |`);
  }

  lines.push("");
  lines.push("This matrix normalizes runtime preparation evidence only. A host may be marked captured only after real manual/runtime evidence is explicitly archived.");
  return `${lines.join("\n")}\n`;
}
