import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp44-runtime-capture-readiness-audit");
const evidencePath = path.join(outputRoot, "evidence.json");
const auditPath = path.join(outputRoot, "runtime-capture-readiness-audit.md");
const frozenPacketsPath = path.join(outputRoot, "frozen-manual-capture-packets.md");
const redactionChecklistPath = path.join(outputRoot, "public-safe-redaction-checklist.md");
const inputEvidencePaths = {
  wp39VscodePacket: path.join(rootDir, "dist", "wp39-vscode-runtime-capture-packet", "evidence.json"),
  wp39DevtoolsPacket: path.join(rootDir, "dist", "wp39-devtools-runtime-capture-packet", "evidence.json"),
  wp39VisualStudioPreparation: path.join(rootDir, "dist", "wp39-visual-studio-runtime-preparation", "evidence.json"),
  wp43ManualPackets: path.join(rootDir, "dist", "wp43-host-confirmation-manual-packet", "evidence.json"),
  wp43Closeout: path.join(rootDir, "dist", "wp43-closeout-c-hia-p1-inputs", "evidence.json")
};

await main();

/**
 * 准备 W-P44.1 runtime capture readiness audit and packet freeze evidence。
 * Prepare W-P44.1 runtime capture readiness audit and packet freeze evidence.
 *
 * This stage freezes the manual runtime-capture packets for VS Code, DevTools
 * and Visual Studio before any real host session is launched. It records which
 * hosts are ready for manual capture, which host still needs route execution
 * preparation, and which public-safe redaction controls must be applied. It
 * does not launch hosts, capture screenshots, run providers, execute target
 * commands, apply edits or mutate target repositories.
 *
 * 中文：本阶段在启动任何真实宿主会话前冻结 VS Code、DevTools 与 Visual Studio
 * 的人工 runtime-capture packet。它记录哪些宿主已经可以进入人工 capture、哪些
 * 仍需 route execution preparation，以及 public-safe redaction 控制。不启动宿主、
 * 不截图、不执行 provider、不运行目标命令、不应用编辑，也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P44.1 readiness and packet freeze evidence.
 */
async function main() {
  const inputs = await readInputs(inputEvidencePaths);
  const frozenPackets = createFrozenPackets(inputs);
  const redactionControls = createRedactionControls();
  const summary = summarize(inputs, frozenPackets, redactionControls);
  const checks = [
    check("HIA_WP44_CAPTURE_READINESS_INPUTS_READY", summary.inputEvidenceCount === 5
      && summary.readyInputEvidenceCount === 5
      && summary.inputHardFailureCount === 0, {
      actual: {
        inputEvidenceCount: summary.inputEvidenceCount,
        inputHardFailureCount: summary.inputHardFailureCount,
        readyInputEvidenceCount: summary.readyInputEvidenceCount
      }
    }),
    check("HIA_WP44_CAPTURE_PACKETS_FROZEN", summary.hostCount === 3
      && summary.frozenPacketCount === 3
      && summary.manualCaptureReadyHostCount === 2
      && summary.routePreparationRequiredHostCount === 1
      && summary.requiredScreenshotCount >= 13
      && summary.requiredTranscriptCount >= 3
      && summary.manualChecklistStepCount >= 30
      && summary.redactionControlCount >= 8, {
      actual: {
        frozenPacketCount: summary.frozenPacketCount,
        hostCount: summary.hostCount,
        manualCaptureReadyHostCount: summary.manualCaptureReadyHostCount,
        manualChecklistStepCount: summary.manualChecklistStepCount,
        redactionControlCount: summary.redactionControlCount,
        requiredScreenshotCount: summary.requiredScreenshotCount,
        requiredTranscriptCount: summary.requiredTranscriptCount,
        routePreparationRequiredHostCount: summary.routePreparationRequiredHostCount
      }
    }),
    check("HIA_WP44_CAPTURE_READINESS_NO_EXECUTION_OR_WRITE", summary.actualRuntimeCaptureExecutedCount === 0
      && summary.captureCompletionClaimedCount === 0
      && summary.providerNetworkExecutedCount === 0
      && summary.externalNetworkCallExecutedCount === 0
      && summary.targetCommandsExecutedByHiaCount === 0
      && summary.targetOwnerExecutionClaimedCount === 0
      && summary.checkedApplyWriteEnabledCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        actualRuntimeCaptureExecutedCount: summary.actualRuntimeCaptureExecutedCount,
        captureCompletionClaimedCount: summary.captureCompletionClaimedCount,
        checkedApplyWriteEnabledCount: summary.checkedApplyWriteEnabledCount,
        directEditObjectCount: summary.directEditObjectCount,
        externalNetworkCallExecutedCount: summary.externalNetworkCallExecutedCount,
        providerNetworkExecutedCount: summary.providerNetworkExecutedCount,
        targetCommandsExecutedByHiaCount: summary.targetCommandsExecutedByHiaCount,
        targetOwnerExecutionClaimedCount: summary.targetOwnerExecutionClaimedCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP44_CAPTURE_READINESS_PRIVACY_CLEAN", summary.sourcesContentPolicy === "none"
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
    check("HIA_WP44_NEXT_CAPTURE_SEQUENCE_READY", summary.readyForVscodeManualCapture === true
      && summary.readyForDevtoolsManualCapture === true
      && summary.readyForVisualStudioRouteDecision === true, {
      actual: {
        readyForDevtoolsManualCapture: summary.readyForDevtoolsManualCapture,
        readyForVisualStudioRouteDecision: summary.readyForVisualStudioRouteDecision,
        readyForVscodeManualCapture: summary.readyForVscodeManualCapture
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp44-runtime-capture-readiness-audit-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp44-vscode-manual-runtime-capture" : "blocked",
    sourceEvidence: Object.fromEntries(
      Object.entries(inputEvidencePaths).map(([key, value]) => [key, normalizePath(value)])
    ),
    audit: {
      cycleGroupId: "C-HIA-P2",
      phase: "W-P44.1",
      mode: "readiness-audit-and-packet-freeze",
      actualRuntimeCaptureExecuted: false,
      checkedApplyWriteEnabled: false,
      sourcesContentPolicy: "none"
    },
    frozenPackets,
    redactionControls,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      audit: normalizePath(auditPath),
      frozenPackets: normalizePath(frozenPacketsPath),
      redactionChecklist: normalizePath(redactionChecklistPath)
    },
    nextStageInputs: [
      {
        phase: "W-P44.2",
        topic: "vscode-extension-development-host-manual-capture",
        status: "ready-input",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P44.3",
        topic: "chrome-devtools-unpacked-extension-manual-capture",
        status: "ready-input",
        writeAuthorityGranted: false
      },
      {
        phase: "W-P44.4",
        topic: "visual-studio-runtime-route-execution-decision",
        status: "ready-input",
        writeAuthorityGranted: false
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P44 runtime capture readiness audit evidence");
  assert.equal(hardFailures.length, 0, `W-P44 runtime capture readiness audit has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(auditPath, renderAudit(evidence), "utf8");
  await writeFile(frozenPacketsPath, renderFrozenPackets(evidence), "utf8");
  await writeFile(redactionChecklistPath, renderRedactionChecklist(evidence), "utf8");
  console.log(`W-P44 runtime capture readiness audit evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P44 runtime capture readiness audit prepared at ${normalizePath(auditPath)}`);
  console.log(`W-P44 frozen manual capture packets prepared at ${normalizePath(frozenPacketsPath)}`);
}

async function readInputs(paths) {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, value]) => [key, await readJson(value)])
  );
  return Object.fromEntries(entries);
}

function createFrozenPackets(inputs) {
  const manualPackets = inputs.wp43ManualPackets.manualPackets || [];
  const packetByHost = new Map(manualPackets.map((packet) => [packet.host, packet]));
  return [
    frozenPacket("vscode", "manual-capture-ready", inputs.wp39VscodePacket.status, packetByHost.get("vscode")),
    frozenPacket("devtools", "manual-capture-ready", inputs.wp39DevtoolsPacket.status, packetByHost.get("devtools")),
    frozenPacket("visual-studio", "route-preparation-required", inputs.wp39VisualStudioPreparation.status, packetByHost.get("visual-studio"))
  ];
}

function frozenPacket(host, readiness, sourceStatus, packet) {
  return {
    host,
    freezeId: `wp44-${host}-manual-capture-freeze-v1`,
    readiness,
    sourceStatus,
    captureRoute: packet?.captureRoute || "manual-route-required",
    requiredScreenshotCount: number(packet?.requiredScreenshotCount),
    requiredTranscriptCount: number(packet?.requiredTranscriptCount),
    manualChecklistStepCount: number(packet?.manualChecklistStepCount),
    captureReportTemplateSectionCount: number(packet?.captureReportTemplateSectionCount),
    actualRuntimeCaptureExecuted: false,
    captureCompletionClaimed: false,
    checkedApplyWriteEnabled: false,
    providerNetworkExecuted: false,
    targetCommandsExecutedByHia: false,
    targetRepositoryMutationAllowed: false,
    workspaceWriteAllowed: false,
    sourcesContentPolicy: "none"
  };
}

function createRedactionControls() {
  return [
    redaction("no-source-body", "Do not include source file bodies in public evidence."),
    redaction("no-sources-content", "Do not serialize source map sourcesContent."),
    redaction("no-credential-values", "Do not include API keys, tokens or secret values."),
    redaction("no-digest-values", "Do not include host-private file digest values."),
    redaction("no-local-absolute-paths", "Do not include local absolute paths in public evidence."),
    redaction("no-private-workspace-name", "Do not include private work-zone paths or identifiers."),
    redaction("no-target-command-output-body", "Do not include target command output unless target owner explicitly approves a public-safe transcript."),
    redaction("metadata-only-screenshots", "Screenshots must show host UI state, not private source content.")
  ];
}

function redaction(id, requirement) {
  return {
    id,
    requirement,
    status: "required-before-public-evidence"
  };
}

function summarize(inputs, frozenPackets, redactionControls) {
  const summaries = Object.values(inputs).map((input) => input.summary || {});
  const readyStatuses = {
    wp39VscodePacket: "ready-for-vscode-manual-runtime-capture",
    wp39DevtoolsPacket: "ready-for-devtools-manual-runtime-capture",
    wp39VisualStudioPreparation: "ready-for-visual-studio-runtime-route-followup",
    wp43ManualPackets: "ready-for-wp43-closeout-and-c-hia-p1-inputs",
    wp43Closeout: "ready-for-c-hia-p1-closeout-and-next-cycle-planning"
  };
  const readyInputEvidenceCount = Object.entries(inputs)
    .filter(([key, evidence]) => evidence.status === readyStatuses[key])
    .length;

  return {
    cycleGroupId: "C-HIA-P2",
    inputEvidenceCount: Object.keys(inputs).length,
    readyInputEvidenceCount,
    inputHardFailureCount: sumField(summaries, "hardFailureCount"),
    hostCount: frozenPackets.length,
    frozenPacketCount: frozenPackets.filter((packet) => packet.freezeId.endsWith("-freeze-v1")).length,
    manualCaptureReadyHostCount: frozenPackets.filter((packet) => packet.readiness === "manual-capture-ready").length,
    routePreparationRequiredHostCount: frozenPackets.filter((packet) => packet.readiness === "route-preparation-required").length,
    requiredScreenshotCount: sumPacketField(frozenPackets, "requiredScreenshotCount"),
    requiredTranscriptCount: sumPacketField(frozenPackets, "requiredTranscriptCount"),
    manualChecklistStepCount: sumPacketField(frozenPackets, "manualChecklistStepCount"),
    captureReportTemplateSectionCount: sumPacketField(frozenPackets, "captureReportTemplateSectionCount"),
    redactionControlCount: redactionControls.length,
    readyForVscodeManualCapture: frozenPackets.some((packet) => packet.host === "vscode" && packet.readiness === "manual-capture-ready"),
    readyForDevtoolsManualCapture: frozenPackets.some((packet) => packet.host === "devtools" && packet.readiness === "manual-capture-ready"),
    readyForVisualStudioRouteDecision: frozenPackets.some((packet) => packet.host === "visual-studio" && packet.readiness === "route-preparation-required"),
    actualRuntimeCaptureExecutedCount: sumPacketBool(frozenPackets, "actualRuntimeCaptureExecuted")
      + sumField(summaries, "actualRuntimeCaptureExecutedCount")
      + sumField(summaries, "actualRuntimeCaptureHostCount")
      + sumBool(summaries, "actualRuntimeCaptureExecuted"),
    captureCompletionClaimedCount: sumPacketBool(frozenPackets, "captureCompletionClaimed")
      + sumField(summaries, "captureCompletionClaimedCount"),
    providerNetworkExecutedCount: sumPacketBool(frozenPackets, "providerNetworkExecuted")
      + sumField(summaries, "providerNetworkExecutedCount")
      + sumBool(summaries, "providerNetworkExecuted"),
    externalNetworkCallExecutedCount: sumBool(summaries, "externalNetworkCallExecuted")
      + sumBool(summaries, "externalNetworkExecuted"),
    targetCommandsExecutedByHiaCount: sumPacketBool(frozenPackets, "targetCommandsExecutedByHia")
      + sumField(summaries, "targetCommandExecutedByHiaCount")
      + sumField(summaries, "targetCommandsExecutedByHiaCount"),
    targetOwnerExecutionClaimedCount: sumField(summaries, "targetOwnerExecutionClaimedCount")
      + sumBool(summaries, "targetOwnerExecutionClaimed"),
    checkedApplyWriteEnabledCount: sumPacketBool(frozenPackets, "checkedApplyWriteEnabled")
      + sumField(summaries, "checkedApplyWriteEnabledCount")
      + sumBool(summaries, "checkedApplyWriteEnabled"),
    workspaceWriteAllowedCount: sumPacketBool(frozenPackets, "workspaceWriteAllowed")
      + sumField(summaries, "workspaceWriteAllowedCount")
      + sumBool(summaries, "workspaceWriteAllowed"),
    targetRepositoryMutationCount: sumPacketBool(frozenPackets, "targetRepositoryMutationAllowed")
      + sumField(summaries, "targetRepositoryMutationCount")
      + sumBool(summaries, "targetRepositoryMutationAllowed"),
    directEditObjectCount: sumField(summaries, "directEditObjectCount"),
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
    sourcesContentPolicy: [...frozenPackets, ...summaries].every((item) => (item.sourcesContentPolicy ?? "none") === "none") ? "none" : "mixed"
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

function sumPacketField(items, field) {
  return items.reduce((sum, item) => sum + number(item[field]), 0);
}

function sumPacketBool(items, field) {
  return items.reduce((sum, item) => sum + (item[field] === true ? 1 : 0), 0);
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

function renderAudit(evidence) {
  const summary = evidence.summary;
  return `# W-P44.1 Runtime Capture Readiness Audit

## Summary

- status: \`${evidence.status}\`
- input evidence ready: ${summary.readyInputEvidenceCount} / ${summary.inputEvidenceCount}
- frozen packets: ${summary.frozenPacketCount} / ${summary.hostCount}
- manual capture ready / route prep required: ${summary.manualCaptureReadyHostCount} / ${summary.routePreparationRequiredHostCount}
- screenshots / transcripts: ${summary.requiredScreenshotCount} / ${summary.requiredTranscriptCount}
- checklist / report sections: ${summary.manualChecklistStepCount} / ${summary.captureReportTemplateSectionCount}
- redaction controls: ${summary.redactionControlCount}
- runtime/provider/network/target-owner execution: ${summary.actualRuntimeCaptureExecutedCount} / ${summary.providerNetworkExecutedCount} / ${summary.externalNetworkCallExecutedCount} / ${summary.targetOwnerExecutionClaimedCount}
- checked apply / workspace write / target mutation / direct edit: ${summary.checkedApplyWriteEnabledCount} / ${summary.workspaceWriteAllowedCount} / ${summary.targetRepositoryMutationCount} / ${summary.directEditObjectCount}
- sourcesContent policy: ${summary.sourcesContentPolicy}

## Next Stage

W-P44.2 can run the VS Code manual runtime capture from the frozen packet.
`;
}

function renderFrozenPackets(evidence) {
  return `# Frozen Manual Capture Packets

${evidence.frozenPackets.map((packet) => `## ${packet.host}

- freeze id: \`${packet.freezeId}\`
- readiness: \`${packet.readiness}\`
- capture route: \`${packet.captureRoute}\`
- screenshots / transcripts: ${packet.requiredScreenshotCount} / ${packet.requiredTranscriptCount}
- checklist / report sections: ${packet.manualChecklistStepCount} / ${packet.captureReportTemplateSectionCount}
- actual runtime capture executed: ${packet.actualRuntimeCaptureExecuted}
- checked apply write enabled: ${packet.checkedApplyWriteEnabled}
- sourcesContent policy: ${packet.sourcesContentPolicy}
`).join("\n")}
`;
}

function renderRedactionChecklist(evidence) {
  return `# Public-Safe Redaction Checklist

${evidence.redactionControls.map((control) => `- ${control.id}: ${control.requirement}`).join("\n")}
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
