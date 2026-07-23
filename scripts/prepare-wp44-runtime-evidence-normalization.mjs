import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp44-runtime-evidence-normalization");
const evidencePath = path.join(outputRoot, "evidence.json");
const slotSchemaPath = path.join(outputRoot, "runtime-evidence-slot-schema.md");
const slotMatrixPath = path.join(outputRoot, "runtime-evidence-slot-matrix.md");
const ingestionNotesPath = path.join(outputRoot, "manual-confirmation-ingestion-notes.md");
const readinessPath = path.join(rootDir, "dist", "wp44-runtime-capture-readiness-audit", "evidence.json");
const vscodeManualPath = path.join(rootDir, "dist", "wp44-vscode-manual-runtime-capture", "evidence.json");
const devtoolsManualPath = path.join(rootDir, "dist", "wp44-devtools-manual-runtime-capture", "evidence.json");
const visualStudioRoutePath = path.join(rootDir, "dist", "wp44-visual-studio-runtime-route-decision", "evidence.json");

await main();

/**
 * 生成 W-P44.5 runtime evidence slots 归一化证据。
 * Generate W-P44.5 normalized runtime evidence slots.
 *
 * This stage converts the W-P44 host-specific outcomes into one evidence slot
 * matrix. VS Code and DevTools may be marked manually verified because the
 * target owner confirmed the runtime behavior in this work session, but they
 * are not marked archived/captured because W-P44 intentionally does not require
 * persistent screenshot evidence. Visual Studio remains a route-decision slot.
 *
 * 中文：本阶段把 W-P44 各宿主的结果归一为统一 evidence slot 矩阵。VS Code 与
 * DevTools 可以标记为“已由用户手动验证”，因为目标所有者已确认真实运行行为；
 * 但不会标记为“已归档 captured”，因为 W-P44 当前不强制持久化截图 evidence。
 * Visual Studio 则保持路线决策 slot。
 *
 * @returns {Promise<void>} Writes public-safe normalized runtime slot evidence and docs.
 */
async function main() {
  const inputs = await readInputs();
  const slotSchema = createSlotSchema();
  const runtimeSlots = createRuntimeSlots(inputs);
  const aggregate = summarize(inputs, runtimeSlots);
  const ingestionInput = createHostEvidenceIngestionInput(runtimeSlots);
  const checks = [
    check("HIA_WP44_RUNTIME_SLOT_INPUTS_READY", inputs.readiness.status === "ready-for-wp44-vscode-manual-runtime-capture"
      && inputs.vscodeManual.status === "ready-for-human-vscode-runtime-capture"
      && inputs.devtoolsManual.status === "ready-for-human-devtools-runtime-capture"
      && inputs.visualStudioRoute.status === "ready-for-wp44-runtime-evidence-normalization"
      && aggregate.inputHardFailureCount === 0, {
      actual: {
        devtoolsStatus: inputs.devtoolsManual.status,
        inputHardFailureCount: aggregate.inputHardFailureCount,
        readinessStatus: inputs.readiness.status,
        visualStudioStatus: inputs.visualStudioRoute.status,
        vscodeStatus: inputs.vscodeManual.status
      }
    }),
    check("HIA_WP44_RUNTIME_SLOT_MATRIX_COMPLETE", aggregate.hostSlotCount === 3
      && aggregate.manualVerificationConfirmedCount === 2
      && aggregate.routeDecisionExecutedCount === 1
      && aggregate.archivedCapturedCount === 0
      && aggregate.normalizedSlotStateCount === 2
      && runtimeSlots.some((slot) => slot.hostRuntime === "extension-development-host")
      && runtimeSlots.some((slot) => slot.hostRuntime === "chrome-devtools-unpacked-extension")
      && runtimeSlots.some((slot) => slot.hostRuntime === "visual-studio-extension-skeleton"), {
      actual: {
        archivedCapturedCount: aggregate.archivedCapturedCount,
        hostSlotCount: aggregate.hostSlotCount,
        manualVerificationConfirmedCount: aggregate.manualVerificationConfirmedCount,
        normalizedSlotStates: aggregate.normalizedSlotStates,
        routeDecisionExecutedCount: aggregate.routeDecisionExecutedCount
      }
    }),
    check("HIA_WP44_RUNTIME_SLOT_NO_FAKE_CAPTURE", aggregate.actualRuntimeObservationConfirmedCount === 2
      && aggregate.runtimeCaptureArchivedCount === 0
      && aggregate.captureCompletionClaimedCount === 0
      && aggregate.publicEvidenceArchivePendingCount === 2
      && aggregate.visualStudioRealRuntimePendingCount === 1, {
      actual: {
        actualRuntimeObservationConfirmedCount: aggregate.actualRuntimeObservationConfirmedCount,
        captureCompletionClaimedCount: aggregate.captureCompletionClaimedCount,
        publicEvidenceArchivePendingCount: aggregate.publicEvidenceArchivePendingCount,
        runtimeCaptureArchivedCount: aggregate.runtimeCaptureArchivedCount,
        visualStudioRealRuntimePendingCount: aggregate.visualStudioRealRuntimePendingCount
      }
    }),
    check("HIA_WP44_RUNTIME_SLOT_USER_CONFIRMATION_RECORDED", aggregate.userConfirmedInSessionCount === 2
      && aggregate.vscodeCommandVerifiedCount === 1
      && aggregate.devtoolsOpenRequestBridgeVerifiedCount === 1
      && aggregate.devtoolsInspectedPageEventVerifiedCount === 1
      && aggregate.visualStudioRouteDecisionExecutedCount === 1, {
      actual: {
        devtoolsInspectedPageEventVerifiedCount: aggregate.devtoolsInspectedPageEventVerifiedCount,
        devtoolsOpenRequestBridgeVerifiedCount: aggregate.devtoolsOpenRequestBridgeVerifiedCount,
        userConfirmedInSessionCount: aggregate.userConfirmedInSessionCount,
        visualStudioRouteDecisionExecutedCount: aggregate.visualStudioRouteDecisionExecutedCount,
        vscodeCommandVerifiedCount: aggregate.vscodeCommandVerifiedCount
      }
    }),
    check("HIA_WP44_RUNTIME_SLOT_NO_EXECUTION_OR_WRITE", aggregate.providerNetworkExecutedCount === 0
      && aggregate.externalNetworkCallExecutedCount === 0
      && aggregate.targetCommandsExecutedByHiaCount === 0
      && aggregate.targetOwnerExecutionClaimedCount === 0
      && aggregate.checkedApplyWriteEnabledCount === 0
      && aggregate.workspaceWriteAllowedCount === 0
      && aggregate.targetRepositoryMutationCount === 0
      && aggregate.directEditObjectCount === 0, {
      actual: {
        checkedApplyWriteEnabledCount: aggregate.checkedApplyWriteEnabledCount,
        directEditObjectCount: aggregate.directEditObjectCount,
        externalNetworkCallExecutedCount: aggregate.externalNetworkCallExecutedCount,
        providerNetworkExecutedCount: aggregate.providerNetworkExecutedCount,
        targetCommandsExecutedByHiaCount: aggregate.targetCommandsExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: aggregate.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: aggregate.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: aggregate.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP44_RUNTIME_SLOT_PRIVACY_CLEAN", aggregate.sourcesContentPolicyNoneCount === 3
      && aggregate.sourceBodyIncludedCount === 0
      && aggregate.sourceTextIncludedCount === 0
      && aggregate.documentContentIncludedCount === 0
      && aggregate.digestValueIncludedCount === 0
      && aggregate.credentialValueIncludedCount === 0
      && aggregate.pathExposureCount === 0, {
      actual: {
        credentialValueIncludedCount: aggregate.credentialValueIncludedCount,
        digestValueIncludedCount: aggregate.digestValueIncludedCount,
        documentContentIncludedCount: aggregate.documentContentIncludedCount,
        pathExposureCount: aggregate.pathExposureCount,
        sourceBodyIncludedCount: aggregate.sourceBodyIncludedCount,
        sourceTextIncludedCount: aggregate.sourceTextIncludedCount,
        sourcesContentPolicyNoneCount: aggregate.sourcesContentPolicyNoneCount
      }
    }),
    check("HIA_WP44_RUNTIME_SLOT_SCHEMA_READY", slotSchema.requiredFields.includes("normalizedSlotState")
      && slotSchema.requiredFields.includes("actualRuntimeObservationConfirmed")
      && slotSchema.requiredFields.includes("runtimeCaptureArchived")
      && slotSchema.states.some((state) => state.id === "manual-verification-confirmed")
      && slotSchema.states.some((state) => state.id === "route-decision-executed")
      && ingestionInput.hostEvidenceIngestionPhase === "W-P44.6", {
      actual: {
        ingestionPhase: ingestionInput.hostEvidenceIngestionPhase,
        requiredFields: slotSchema.requiredFields,
        states: slotSchema.states.map((state) => state.id)
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp44-runtime-evidence-normalization",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp44-host-evidence-ingestion" : "blocked",
    sourceEvidence: {
      wp44Readiness: normalizePath(readinessPath),
      vscodeManualCapturePacket: normalizePath(vscodeManualPath),
      devtoolsManualCapturePacket: normalizePath(devtoolsManualPath),
      visualStudioRouteDecision: normalizePath(visualStudioRoutePath)
    },
    summary: {
      ...aggregate,
      hardFailureCount: hardFailures.length
    },
    slotSchema,
    runtimeSlots,
    hostEvidenceIngestionInput: ingestionInput,
    checks,
    generatedDocs: {
      runtimeEvidenceSlotSchema: normalizePath(slotSchemaPath),
      runtimeEvidenceSlotMatrix: normalizePath(slotMatrixPath),
      manualConfirmationIngestionNotes: normalizePath(ingestionNotesPath)
    },
    nextStageInputs: [
      {
        phase: "W-P44.6",
        topic: "host-evidence-ingestion-and-public-safe-redaction-check",
        status: "ready-input",
        writeAuthorityGranted: false
      },
      {
        phase: "G-VS-P5-or-later",
        topic: "visual-studio-real-runtime-capture-after-vsix-audit",
        status: "deferred-input",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P44 runtime evidence normalization");
  assert.equal(hardFailures.length, 0, `W-P44 runtime evidence normalization has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(slotSchemaPath, renderSlotSchema(slotSchema), "utf8");
  await writeFile(slotMatrixPath, renderSlotMatrix(runtimeSlots, aggregate), "utf8");
  await writeFile(ingestionNotesPath, renderIngestionNotes(ingestionInput), "utf8");
  console.log(`W-P44 runtime evidence normalization prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P44 runtime evidence slot schema prepared at ${normalizePath(slotSchemaPath)}`);
  console.log(`W-P44 runtime evidence slot matrix prepared at ${normalizePath(slotMatrixPath)}`);
}

async function readInputs() {
  const [
    readiness,
    vscodeManual,
    devtoolsManual,
    visualStudioRoute
  ] = await Promise.all([
    readJson(readinessPath),
    readJson(vscodeManualPath),
    readJson(devtoolsManualPath),
    readJson(visualStudioRoutePath)
  ]);

  return {
    devtoolsManual,
    readiness,
    visualStudioRoute,
    vscodeManual
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createRuntimeSlots(inputs) {
  return [
    createManualVerificationSlot({
      evidence: inputs.vscodeManual,
      evidencePath: vscodeManualPath,
      hostKind: "vscode",
      observationMarkers: [
        marker("command-surface-verified", true, "命令面板可见 HIA: Show Host Apply UX Intake。"),
        marker("quickpick-surface-verified", true, "QuickPick 可列出三类 host apply UX surface。"),
        marker("output-report-verified", true, "Output Channel 输出 host apply UX intake evidence。"),
        marker("deferred-gates-verified", true, "provider/network、target-owner、checked apply write 均保持 disabled。"),
        marker("path-redaction-verified", true, "public-safe 输出隐藏本地路径。")
      ]
    }),
    createManualVerificationSlot({
      evidence: inputs.devtoolsManual,
      evidencePath: devtoolsManualPath,
      hostKind: "devtools",
      observationMarkers: [
        marker("panel-runtime-verified", true, "Chrome DevTools HIA panel 可见并加载默认 public-safe payload。"),
        marker("review-surface-verified", true, "Review tab 与 checked apply disabled 可见。"),
        marker("open-request-bridge-verified", true, "Relations open request 显示 inspectedWindow bridge dispatched。"),
        marker("inspected-page-event-verified", true, "local HTTP inspected page 与 Console 均收到 HIA_DEVTOOLS_OPEN_REQUEST。"),
        marker("no-page-data-returned", true, "inspected page 不向 panel 返回 page data。")
      ]
    }),
    createVisualStudioRouteSlot(inputs.visualStudioRoute)
  ];
}

function createManualVerificationSlot({ evidence, evidencePath, hostKind, observationMarkers }) {
  const packet = evidence.manualCapturePacket || {};

  return {
    host: packet.host,
    hostKind,
    hostRuntime: packet.hostRuntime,
    phase: packet.phase,
    sourceEvidence: normalizePath(evidencePath),
    inputContract: evidence.contract,
    inputStatus: evidence.status,
    inputHardFailureCount: numberValue(evidence.summary?.hardFailureCount),
    normalizedSlotState: "manual-verification-confirmed",
    slotMeaningZh: "目标所有者已在真实宿主中完成手工验证；本阶段不持久化截图 evidence，因此不标记为 captured/archived。",
    actualRuntimeObservationConfirmed: true,
    manualVerificationSource: "user-confirmed-in-session",
    runtimeCaptureArchived: false,
    publicEvidenceArchiveState: "not-persisted-by-stage-policy",
    captureCompletionClaimed: false,
    captureArchiveRequiredBeforeRelease: true,
    actualScreenshotsReceived: numberValue(packet.actualScreenshotsReceived),
    actualTranscriptsReceived: numberValue(packet.actualTranscriptsReceived),
    actualReportReceived: packet.actualReportReceived === true,
    observationMarkers,
    packetMaterial: {
      captureSlotStatus: packet.captureSlotStatus,
      packetStatus: packet.packetStatus,
      requiredScreenshotCount: numberValue(packet.requiredScreenshotCount),
      requiredTranscriptCount: numberValue(packet.requiredTranscriptCount),
      manualChecklistStepCount: numberValue(packet.manualChecklistStepCount),
      intakeTemplateSectionCount: numberValue(packet.intakeTemplateSectionCount),
      redactionControlCount: numberValue(packet.redactionControlCount)
    },
    visualStudioRuntime: {
      realRuntimeImplementationPending: false,
      visualStudioExtensionPackageBuilt: false,
      visualStudioExperimentalInstanceExecuted: false,
      vsixPublished: false
    },
    executionAndWriteBoundary: createExecutionAndWriteBoundary(packet),
    privacy: createPrivacy(packet, evidence.summary)
  };
}

function createVisualStudioRouteSlot(evidence) {
  const packet = evidence.routeExecutionPacket || {};

  return {
    host: packet.host,
    hostKind: "visual-studio",
    hostRuntime: packet.hostRuntime,
    phase: packet.phase,
    sourceEvidence: normalizePath(visualStudioRoutePath),
    inputContract: evidence.contract,
    inputStatus: evidence.status,
    inputHardFailureCount: numberValue(evidence.summary?.hardFailureCount),
    normalizedSlotState: "route-decision-executed",
    slotMeaningZh: "当前周期只完成 Visual Studio 路线决策；真实 VSIX 与 runtime capture 延后到 VS 专项。",
    actualRuntimeObservationConfirmed: false,
    manualVerificationSource: "not-applicable-current-cycle",
    runtimeCaptureArchived: false,
    publicEvidenceArchiveState: "not-applicable-current-cycle",
    captureCompletionClaimed: false,
    captureArchiveRequiredBeforeRelease: true,
    actualScreenshotsReceived: 0,
    actualTranscriptsReceived: 0,
    actualReportReceived: false,
    observationMarkers: [
      marker("route-decision-executed", true, "当前周期路线选择为 contract-level-route-decision。"),
      marker("future-preferred-route-recorded", true, "后续首选路线为 visualstudio-extensibility-vsix-after-audit。"),
      marker("fallback-route-recorded", true, "保留 vssdk-vsix-experimental-instance-if-feature-gap 作为后备路线。"),
      marker("real-runtime-deferred", true, "真实 Visual Studio runtime capture 延后到后续 VS 专项。")
    ],
    routeDecision: {
      selectedCurrentRoute: packet.selectedCurrentRoute,
      futurePreferredRoute: packet.futurePreferredRoute,
      fallbackRoute: packet.fallbackRoute,
      routeExecutionMode: packet.routeExecutionMode,
      officialReferenceCount: numberValue(evidence.summary?.officialReferenceCount),
      captureArtifactCount: numberValue(evidence.summary?.captureArtifactCount)
    },
    packetMaterial: {
      captureSlotStatus: "implementation-required-before-capture",
      packetStatus: packet.packetStatus,
      requiredScreenshotCount: 0,
      requiredTranscriptCount: 0,
      manualChecklistStepCount: numberValue(evidence.summary?.routeChecklistStepCount),
      intakeTemplateSectionCount: 0,
      redactionControlCount: 0
    },
    visualStudioRuntime: {
      realRuntimeImplementationPending: true,
      visualStudioExtensionPackageBuilt: packet.visualStudioExtensionPackageBuilt === true,
      visualStudioExperimentalInstanceExecuted: packet.visualStudioExperimentalInstanceExecuted === true,
      vsixPublished: packet.vsixPublished === true
    },
    executionAndWriteBoundary: createExecutionAndWriteBoundary(packet),
    privacy: createPrivacy(packet, evidence.summary)
  };
}

function marker(id, observed, noteZh) {
  return {
    id,
    observed,
    noteZh
  };
}

function createExecutionAndWriteBoundary(packet) {
  return {
    providerNetworkExecuted: packet.providerNetworkExecuted === true,
    externalNetworkCallExecuted: packet.externalNetworkCallExecuted === true,
    targetCommandsExecutedByHia: packet.targetCommandsExecutedByHia === true,
    targetOwnerExecutionClaimed: packet.targetOwnerExecutionClaimed === true,
    checkedApplyWriteEnabled: packet.checkedApplyWriteEnabled === true,
    workspaceWriteAllowed: packet.workspaceWriteAllowed === true,
    targetRepositoryMutationAllowed: packet.targetRepositoryMutationAllowed === true,
    directEditObjectIncluded: packet.directEditObjectIncluded === true
  };
}

function createPrivacy(packet, summary = {}) {
  return {
    sourcesContentPolicy: packet.sourcesContentPolicy,
    sourceBodyIncluded: packet.sourceBodyIncluded === true || summary.sourceBodyIncludedInEvidence === true,
    sourceTextIncluded: packet.sourceTextIncluded === true,
    documentContentIncluded: packet.documentContentIncluded === true,
    digestValueIncluded: packet.digestValueIncluded === true,
    credentialValueIncluded: packet.credentialValueIncluded === true,
    localAbsolutePathIncluded: packet.localAbsolutePathIncluded === true,
    pathExposureCount: numberValue(summary.pathExposureCount) + boolCount(packet.localAbsolutePathIncluded)
  };
}

function createSlotSchema() {
  return {
    contract: "hia-wp44-runtime-evidence-slot",
    contractVersion: "0.1.0-draft",
    requiredFields: [
      "host",
      "hostKind",
      "hostRuntime",
      "phase",
      "sourceEvidence",
      "inputContract",
      "inputStatus",
      "normalizedSlotState",
      "actualRuntimeObservationConfirmed",
      "manualVerificationSource",
      "runtimeCaptureArchived",
      "publicEvidenceArchiveState",
      "captureCompletionClaimed",
      "executionAndWriteBoundary",
      "privacy"
    ],
    states: [
      {
        id: "manual-verification-confirmed",
        meaningZh: "真实宿主行为已由目标所有者手工确认，但截图/transcript 未作为本阶段 public evidence 归档。"
      },
      {
        id: "route-decision-executed",
        meaningZh: "本阶段只完成 runtime route decision，真实宿主实现与 capture 仍需后续专项。"
      },
      {
        id: "captured-archived",
        meaningZh: "真实宿主 capture 已执行，且 public-safe 截图/transcript/report 已归档。"
      },
      {
        id: "blocked",
        meaningZh: "存在明确阻塞，不能继续进入后续 gate。"
      },
      {
        id: "not-applicable",
        meaningZh: "宿主不属于当前 capture 范围。"
      }
    ],
    captureCompletionRuleZh: "只有 normalizedSlotState=captured-archived 才允许 runtimeCaptureArchived=true 或 captureCompletionClaimed=true。",
    manualVerificationRuleZh: "manual-verification-confirmed 表示用户确认真实运行观察成立，但不等同于发布级截图证据已归档。",
    privacyRuleZh: "slot evidence 不得包含源码正文、sourcesContent、本地绝对路径、file URL、credential、digest 或私有工作区路径。",
    writeAuthorityRuleZh: "runtime evidence slot 不授予 provider/network、target command、checked apply write、workspace write、target mutation 或 direct edit 权限。"
  };
}

function summarize(inputs, runtimeSlots) {
  const inputSummaries = [
    inputs.readiness.summary || {},
    inputs.vscodeManual.summary || {},
    inputs.devtoolsManual.summary || {},
    inputs.visualStudioRoute.summary || {}
  ];
  const normalizedSlotStates = [...new Set(runtimeSlots.map((slot) => slot.normalizedSlotState))].sort();

  return {
    cycleGroupId: "C-HIA-P2",
    phase: "W-P44.5",
    hostSlotCount: runtimeSlots.length,
    normalizedSlotStates,
    normalizedSlotStateCount: normalizedSlotStates.length,
    manualVerificationConfirmedCount: countBy(runtimeSlots, "normalizedSlotState", "manual-verification-confirmed"),
    routeDecisionExecutedCount: countBy(runtimeSlots, "normalizedSlotState", "route-decision-executed"),
    archivedCapturedCount: countBy(runtimeSlots, "normalizedSlotState", "captured-archived"),
    actualRuntimeObservationConfirmedCount: runtimeSlots.filter((slot) => slot.actualRuntimeObservationConfirmed === true).length,
    runtimeCaptureArchivedCount: runtimeSlots.filter((slot) => slot.runtimeCaptureArchived === true).length,
    captureCompletionClaimedCount: runtimeSlots.filter((slot) => slot.captureCompletionClaimed === true).length,
    publicEvidenceArchivePendingCount: runtimeSlots.filter((slot) => slot.publicEvidenceArchiveState === "not-persisted-by-stage-policy").length,
    visualStudioRealRuntimePendingCount: runtimeSlots.filter((slot) => slot.visualStudioRuntime?.realRuntimeImplementationPending === true).length,
    userConfirmedInSessionCount: runtimeSlots.filter((slot) => slot.manualVerificationSource === "user-confirmed-in-session").length,
    vscodeCommandVerifiedCount: countObservedMarker(runtimeSlots, "command-surface-verified"),
    devtoolsOpenRequestBridgeVerifiedCount: countObservedMarker(runtimeSlots, "open-request-bridge-verified"),
    devtoolsInspectedPageEventVerifiedCount: countObservedMarker(runtimeSlots, "inspected-page-event-verified"),
    visualStudioRouteDecisionExecutedCount: countObservedMarker(runtimeSlots, "route-decision-executed"),
    requiredScreenshotCount: sum(runtimeSlots, (slot) => slot.packetMaterial?.requiredScreenshotCount),
    requiredTranscriptCount: sum(runtimeSlots, (slot) => slot.packetMaterial?.requiredTranscriptCount),
    manualChecklistStepCount: sum(runtimeSlots, (slot) => slot.packetMaterial?.manualChecklistStepCount),
    inputHardFailureCount: sum(inputSummaries, (summary) => summary.hardFailureCount),
    providerNetworkExecutedCount: countNestedTrue(runtimeSlots, "executionAndWriteBoundary", "providerNetworkExecuted"),
    externalNetworkCallExecutedCount: countNestedTrue(runtimeSlots, "executionAndWriteBoundary", "externalNetworkCallExecuted"),
    targetCommandsExecutedByHiaCount: countNestedTrue(runtimeSlots, "executionAndWriteBoundary", "targetCommandsExecutedByHia"),
    targetOwnerExecutionClaimedCount: countNestedTrue(runtimeSlots, "executionAndWriteBoundary", "targetOwnerExecutionClaimed"),
    checkedApplyWriteEnabledCount: countNestedTrue(runtimeSlots, "executionAndWriteBoundary", "checkedApplyWriteEnabled"),
    workspaceWriteAllowedCount: countNestedTrue(runtimeSlots, "executionAndWriteBoundary", "workspaceWriteAllowed"),
    targetRepositoryMutationCount: countNestedTrue(runtimeSlots, "executionAndWriteBoundary", "targetRepositoryMutationAllowed"),
    directEditObjectCount: countNestedTrue(runtimeSlots, "executionAndWriteBoundary", "directEditObjectIncluded")
      + countDirectEditObjects(runtimeSlots),
    sourcesContentPolicyNoneCount: runtimeSlots.filter((slot) => slot.privacy?.sourcesContentPolicy === "none").length,
    sourceBodyIncludedCount: countNestedTrue(runtimeSlots, "privacy", "sourceBodyIncluded"),
    sourceTextIncludedCount: countNestedTrue(runtimeSlots, "privacy", "sourceTextIncluded"),
    documentContentIncludedCount: countNestedTrue(runtimeSlots, "privacy", "documentContentIncluded"),
    digestValueIncludedCount: countNestedTrue(runtimeSlots, "privacy", "digestValueIncluded"),
    credentialValueIncludedCount: countNestedTrue(runtimeSlots, "privacy", "credentialValueIncluded"),
    pathExposureCount: sum(runtimeSlots, (slot) => slot.privacy?.pathExposureCount)
  };
}

function createHostEvidenceIngestionInput(runtimeSlots) {
  return {
    contract: "hia-wp44-host-evidence-ingestion-input",
    contractVersion: "0.1.0-draft",
    hostEvidenceIngestionPhase: "W-P44.6",
    releaseGradeArchiveRequired: true,
    mayIngestManualConfirmationWithoutScreenshotArchive: true,
    mayClaimCapturedWithoutPublicSafeArchive: false,
    writeAuthorityGranted: false,
    hostSlots: runtimeSlots.map((slot) => ({
      host: slot.host,
      hostKind: slot.hostKind,
      hostRuntime: slot.hostRuntime,
      normalizedSlotState: slot.normalizedSlotState,
      actualRuntimeObservationConfirmed: slot.actualRuntimeObservationConfirmed,
      runtimeCaptureArchived: slot.runtimeCaptureArchived,
      publicEvidenceArchiveState: slot.publicEvidenceArchiveState,
      captureCompletionClaimed: slot.captureCompletionClaimed,
      captureArchiveRequiredBeforeRelease: slot.captureArchiveRequiredBeforeRelease,
      observationMarkerCount: slot.observationMarkers.filter((item) => item.observed === true).length,
      executionAndWriteBoundary: slot.executionAndWriteBoundary,
      privacy: slot.privacy
    }))
  };
}

function check(code, passed, details = {}) {
  return {
    code,
    details,
    status: passed ? "pass" : "fail"
  };
}

function countBy(items, field, expected) {
  return items.filter((item) => item[field] === expected).length;
}

function countObservedMarker(slots, markerId) {
  return slots.filter((slot) => slot.observationMarkers.some((markerItem) => markerItem.id === markerId && markerItem.observed === true)).length;
}

function countNestedTrue(items, objectKey, field) {
  return items.filter((item) => item[objectKey]?.[field] === true).length;
}

function sum(items, selector) {
  return items.reduce((total, item) => total + numberValue(selector(item)), 0);
}

function boolCount(value) {
  return value === true ? 1 : 0;
}

function numberValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
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

function renderSlotSchema(schema) {
  const lines = [
    "# W-P44.5 Runtime Evidence Slot Schema",
    "",
    "## 摘要",
    "",
    `- Contract / 契约：\`${schema.contract}@${schema.contractVersion}\``,
    "",
    "本 schema 用于区分“已手工验证”“已归档 captured”和“路线决策已执行”。W-P44.5 不把未归档截图的手工验证伪装成发布级 capture evidence。",
    "",
    "## Required Fields / 必需字段",
    ""
  ];

  for (const field of schema.requiredFields) {
    lines.push(`- \`${field}\``);
  }

  lines.push("");
  lines.push("## States / 状态");
  lines.push("");

  for (const state of schema.states) {
    lines.push(`- \`${state.id}\`：${state.meaningZh}`);
  }

  lines.push("");
  lines.push("## Rules / 规则");
  lines.push("");
  lines.push(`- ${schema.captureCompletionRuleZh}`);
  lines.push(`- ${schema.manualVerificationRuleZh}`);
  lines.push(`- ${schema.privacyRuleZh}`);
  lines.push(`- ${schema.writeAuthorityRuleZh}`);

  return `${lines.join("\n")}\n`;
}

function renderSlotMatrix(runtimeSlots, aggregate) {
  const lines = [
    "# W-P44.5 Runtime Evidence Slot Matrix",
    "",
    "## 摘要",
    "",
    `- Host slots / 宿主 slot：${aggregate.hostSlotCount}`,
    `- Manual verification confirmed / 已手工验证：${aggregate.manualVerificationConfirmedCount}`,
    `- Route decision executed / 已执行路线决策：${aggregate.routeDecisionExecutedCount}`,
    `- Archived captured / 已归档 captured：${aggregate.archivedCapturedCount}`,
    `- Runtime capture archived / 已归档 runtime capture：${aggregate.runtimeCaptureArchivedCount}`,
    `- Capture completion claimed / 声明 capture 完成：${aggregate.captureCompletionClaimedCount}`,
    "",
    "## Matrix / 矩阵",
    "",
    "| Host | Runtime | State | Observation Confirmed | Archived | Archive State | Write | Source Policy |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const slot of runtimeSlots) {
    const writeDisabled = Object.values(slot.executionAndWriteBoundary).every((value) => value === false);
    lines.push(`| \`${slot.host}\` | \`${slot.hostRuntime}\` | \`${slot.normalizedSlotState}\` | ${slot.actualRuntimeObservationConfirmed} | ${slot.runtimeCaptureArchived} | \`${slot.publicEvidenceArchiveState}\` | ${writeDisabled ? "disabled" : "enabled"} | \`${slot.privacy.sourcesContentPolicy}\` |`);
  }

  lines.push("");
  lines.push("## 说明");
  lines.push("");
  lines.push("VS Code 与 DevTools 目前是目标所有者已确认的真实宿主观察结果；因为本阶段不强制持久化截图，它们仍不是 release-grade archived capture。Visual Studio 当前为路线决策 slot，真实 VSIX/runtime capture 后延。");

  return `${lines.join("\n")}\n`;
}

function renderIngestionNotes(ingestionInput) {
  const lines = [
    "# W-P44.5 Manual Confirmation Ingestion Notes",
    "",
    "## 摘要",
    "",
    `- Next phase / 下一阶段：\`${ingestionInput.hostEvidenceIngestionPhase}\``,
    `- Release-grade archive required / 发布级归档是否必需：${ingestionInput.releaseGradeArchiveRequired}`,
    `- May ingest manual confirmation without screenshot archive / 是否可吸收未截图归档的手工确认：${ingestionInput.mayIngestManualConfirmationWithoutScreenshotArchive}`,
    `- May claim captured without archive / 无归档是否可声明 captured：${ingestionInput.mayClaimCapturedWithoutPublicSafeArchive}`,
    `- Write authority granted / 是否授予写入权：${ingestionInput.writeAuthorityGranted}`,
    "",
    "## W-P44.6 输入规则",
    "",
    "W-P44.6 可以把用户确认的 VS Code / DevTools 手工验证作为 runtime observation evidence 吸收，但只能保持 manual-verification-confirmed。若后续需要发布级证明，必须重新补采 public-safe screenshot、transcript 和 redaction report，然后才允许进入 captured-archived。",
    "",
    "## Host Slots",
    ""
  ];

  for (const slot of ingestionInput.hostSlots) {
    lines.push(`- \`${slot.host}\` / \`${slot.hostRuntime}\`：state=\`${slot.normalizedSlotState}\`，observed=${slot.actualRuntimeObservationConfirmed}，archived=${slot.runtimeCaptureArchived}，markers=${slot.observationMarkerCount}`);
  }

  return `${lines.join("\n")}\n`;
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
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
