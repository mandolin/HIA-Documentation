import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp39-devtools-runtime-capture-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const manualChecklistPath = path.join(outputRoot, "manual-devtools-runtime-capture-checklist.md");
const captureReportTemplatePath = path.join(outputRoot, "manual-capture-report-template.md");
const intakePath = path.join(rootDir, "dist", "wp39-host-runtime-capture-intake", "evidence.json");
const hostParityPath = path.join(rootDir, "dist", "wp38-devtools-visual-studio-confirmation-parity", "evidence.json");
const devtoolsCheckPath = path.join(rootDir, "dist", "devtools-extension-check.json");
const manifestPath = path.join(rootDir, "apps", "devtools-extension", "manifest.json");
const panelHtmlPath = path.join(rootDir, "apps", "devtools-extension", "panel.html");
const panelCorePath = path.join(rootDir, "apps", "devtools-extension", "panel-core.js");

await main();

/**
 * 准备 W-P39.3 Chrome DevTools runtime capture packet evidence。
 * Prepare W-P39.3 Chrome DevTools runtime capture packet evidence.
 *
 * This script packages a manual runtime capture workflow for the unpacked HIA
 * DevTools extension. It validates the static zero-permission shell and writes
 * capture materials without launching Chrome or claiming real browser evidence.
 *
 * 中文：本脚本为 HIA unpacked DevTools extension 整理手工 runtime capture 流程。
 * 它校验静态零权限 shell 并写入采集材料，但不启动 Chrome，也不宣称真实浏览器
 * 证据已经完成。
 *
 * @returns {Promise<void>} Writes public-safe packet evidence and manual templates.
 */
async function main() {
  const intake = await readJson(intakePath);
  const hostParity = await readJson(hostParityPath);
  const devtoolsCheck = await readJson(devtoolsCheckPath);
  const manifest = await readJson(manifestPath);
  const panelHtml = await readFile(panelHtmlPath, "utf8");
  const panelCore = await readFile(panelCorePath, "utf8");
  const devtoolsHostPlan = findHostPlan(intake, "chrome-devtools-unpacked-extension");
  const devtoolsParity = findHostParity(hostParity, "devtools");
  const captureArtifacts = createCaptureArtifacts();
  const manualChecklist = createManualChecklist(captureArtifacts);
  const captureReportTemplate = createCaptureReportTemplate(captureArtifacts);
  const packet = {
    host: "chrome-devtools-unpacked-extension",
    packetStatus: "ready-for-human-runtime-capture",
    sourceInput: "W-P39.1",
    appDirectory: "apps/devtools-extension",
    runtimeEntry: "Chrome DevTools > HIA panel",
    launchMode: "chrome-load-unpacked-extension",
    captureArtifacts,
    manualChecklist: normalizePath(manualChecklistPath),
    captureReportTemplate: normalizePath(captureReportTemplatePath),
    actualRuntimeCaptureExecuted: false,
    hostPermissionsRequired: false,
    extensionPermissionsRequired: false,
    inspectedWindowEvalExpected: true,
    returnsPageData: false,
    checkedApplyAvailable: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    sourceBodyAllowedInCaptureReport: false,
    sourcesContentPolicy: "none"
  };
  const summary = {
    intakeReady: intake.status === "ready-for-wp39-host-runtime-capture-baseline",
    intakeHardFailureCount: Number(intake.summary?.hardFailureCount ?? -1),
    cycleGroupId: intake.summary?.cycleGroupId,
    devtoolsHostPlanStatus: devtoolsHostPlan.status,
    hostParityReady: hostParity.status === "ready-for-wp38-closeout-and-next-inputs",
    hostParityHardFailureCount: Number(hostParity.summary?.hardFailureCount ?? -1),
    devtoolsParityStatus: devtoolsParity.status,
    devtoolsCheckReady: devtoolsCheck.contract === "hia-devtools-extension-check",
    manifestVersion: manifest.manifest_version,
    devtoolsPageDeclared: manifest.devtools_page === "devtools.html",
    permissionCount: Array.isArray(manifest.permissions) ? manifest.permissions.length : -1,
    hostPermissionCount: Array.isArray(manifest.host_permissions) ? manifest.host_permissions.length : -1,
    panelModuleDeclared: panelHtml.includes('./panel.js'),
    reviewSurfaceReady: devtoolsCheck.panel?.reviewSurface?.contract === "hia-devtools-review-surface",
    checkedApplyConfirmationReady: devtoolsCheck.panel?.reviewSurface?.checkedApplyConfirmation?.status === "input-ready",
    targetCollaborationReady: devtoolsCheck.panel?.reviewSurface?.targetCollaboration?.status === "input-ready",
    bridgeContractReady: devtoolsCheck.panel?.bridge?.contract === "hia-devtools-open-request-bridge",
    bridgeEventDeclared: panelCore.includes("hia:devtools-open-request"),
    inspectedWindowEvalAllowedByPacket: packet.inspectedWindowEvalExpected,
    returnsPageData: packet.returnsPageData,
    packetStatus: packet.packetStatus,
    captureArtifactCount: captureArtifacts.length,
    requiredScreenshotCount: captureArtifacts.filter((artifact) => artifact.kind === "screenshot").length,
    requiredTranscriptCount: captureArtifacts.filter((artifact) => artifact.kind === "transcript").length,
    manualChecklistStepCount: manualChecklist.steps.length,
    captureReportTemplateSectionCount: captureReportTemplate.sections.length,
    actualRuntimeCaptureExecuted: packet.actualRuntimeCaptureExecuted,
    checkedApplyAvailable: packet.checkedApplyAvailable,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({ packet, manualChecklist, captureReportTemplate }),
    pathExposureCount: countPathExposureValues({ packet, manualChecklist, captureReportTemplate }),
    sourceBodyIncludedInEvidence: false,
    sourcesContentPolicy: "none"
  };
  const checks = [
    check("HIA_WP39_DEVTOOLS_PACKET_INPUTS_READY", summary.intakeReady === true
      && summary.intakeHardFailureCount === 0
      && summary.cycleGroupId === "C-HIA-P1"
      && summary.devtoolsHostPlanStatus === "manual-capture-ready"
      && summary.hostParityReady === true
      && summary.hostParityHardFailureCount === 0
      && summary.devtoolsParityStatus === "input-ready"
      && summary.devtoolsCheckReady === true, {
      actual: {
        cycleGroupId: summary.cycleGroupId,
        devtoolsCheckContract: devtoolsCheck.contract,
        devtoolsHostPlanStatus: summary.devtoolsHostPlanStatus,
        devtoolsParityStatus: summary.devtoolsParityStatus,
        hostParityHardFailureCount: summary.hostParityHardFailureCount,
        hostParityStatus: hostParity.status,
        intakeHardFailureCount: summary.intakeHardFailureCount,
        intakeStatus: intake.status
      }
    }),
    check("HIA_WP39_DEVTOOLS_PACKET_ZERO_PERMISSION_SHELL_READY", summary.manifestVersion === 3
      && summary.devtoolsPageDeclared === true
      && summary.permissionCount === 0
      && summary.hostPermissionCount === 0
      && summary.panelModuleDeclared === true, {
      actual: {
        devtoolsPageDeclared: summary.devtoolsPageDeclared,
        hostPermissionCount: summary.hostPermissionCount,
        manifestVersion: summary.manifestVersion,
        panelModuleDeclared: summary.panelModuleDeclared,
        permissionCount: summary.permissionCount
      }
    }),
    check("HIA_WP39_DEVTOOLS_PACKET_REVIEW_AND_BRIDGE_READY", summary.reviewSurfaceReady === true
      && summary.checkedApplyConfirmationReady === true
      && summary.targetCollaborationReady === true
      && summary.bridgeContractReady === true
      && summary.bridgeEventDeclared === true
      && summary.inspectedWindowEvalAllowedByPacket === true
      && summary.returnsPageData === false, {
      actual: {
        bridgeContractReady: summary.bridgeContractReady,
        bridgeEventDeclared: summary.bridgeEventDeclared,
        checkedApplyConfirmationReady: summary.checkedApplyConfirmationReady,
        inspectedWindowEvalAllowedByPacket: summary.inspectedWindowEvalAllowedByPacket,
        returnsPageData: summary.returnsPageData,
        reviewSurfaceReady: summary.reviewSurfaceReady,
        targetCollaborationReady: summary.targetCollaborationReady
      }
    }),
    check("HIA_WP39_DEVTOOLS_PACKET_CAPTURE_MATERIAL_READY", summary.packetStatus === "ready-for-human-runtime-capture"
      && summary.captureArtifactCount >= 5
      && summary.requiredScreenshotCount >= 4
      && summary.requiredTranscriptCount >= 1
      && summary.manualChecklistStepCount >= 10
      && summary.captureReportTemplateSectionCount >= 7, {
      actual: {
        captureArtifactCount: summary.captureArtifactCount,
        captureReportTemplateSectionCount: summary.captureReportTemplateSectionCount,
        manualChecklistStepCount: summary.manualChecklistStepCount,
        packetStatus: summary.packetStatus,
        requiredScreenshotCount: summary.requiredScreenshotCount,
        requiredTranscriptCount: summary.requiredTranscriptCount
      }
    }),
    check("HIA_WP39_DEVTOOLS_PACKET_MANUAL_CAPTURE_NOT_CLAIMED", summary.actualRuntimeCaptureExecuted === false
      && summary.checkedApplyAvailable === false, {
      actual: {
        actualRuntimeCaptureExecuted: summary.actualRuntimeCaptureExecuted,
        checkedApplyAvailable: summary.checkedApplyAvailable
      }
    }),
    check("HIA_WP39_DEVTOOLS_PACKET_NO_WRITE_AUTHORITY", summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        lspServerOwnedApplyCount: summary.lspServerOwnedApplyCount,
        providerOwnedApplyCount: summary.providerOwnedApplyCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        targetRepositoryWriteAttemptedCount: summary.targetRepositoryWriteAttemptedCount,
        workspaceApplyEditCallCount: summary.workspaceApplyEditCallCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP39_DEVTOOLS_PACKET_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp39-devtools-runtime-capture-packet-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-devtools-manual-runtime-capture" : "blocked",
    sourceEvidence: {
      hostRuntimeCaptureIntake: normalizePath(intakePath),
      hostParity: normalizePath(hostParityPath),
      devtoolsExtensionCheck: normalizePath(devtoolsCheckPath),
      manifest: "apps/devtools-extension/manifest.json",
      panelHtml: "apps/devtools-extension/panel.html",
      panelCore: "apps/devtools-extension/panel-core.js"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    packet,
    manualChecklist,
    captureReportTemplate,
    checks,
    nextContractInputs: [
      {
        phase: "W-P39.3/manual",
        topic: "devtools-human-runtime-capture",
        reason: "A human can now load the unpacked extension and record visible DevTools evidence without changing host permissions or write authority."
      },
      {
        phase: "W-P39.4",
        topic: "visual-studio-runtime-preparation",
        reason: "Visual Studio remains runtime-prep-required and should be handled after VS Code and DevTools packet schemas are stable."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P39 DevTools runtime capture packet evidence");
  assert.equal(hardFailures.length, 0, `W-P39 DevTools packet evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(manualChecklistPath, renderChecklistMarkdown(manualChecklist), "utf8");
  await writeFile(captureReportTemplatePath, renderCaptureReportTemplateMarkdown(captureReportTemplate), "utf8");
  console.log(`W-P39 DevTools runtime capture packet evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Manual checklist prepared at ${normalizePath(manualChecklistPath)}`);
  console.log(`Capture report template prepared at ${normalizePath(captureReportTemplatePath)}`);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Missing or invalid W-P39.3 input evidence at ${normalizePath(filePath)}. Run pnpm run wp39:host-runtime-intake:evidence and pnpm run devtools:check first. ${error.message}`);
  }
}

function findHostPlan(intake, hostName) {
  const host = Array.isArray(intake.hostCapturePlan)
    ? intake.hostCapturePlan.find((candidate) => candidate.host === hostName)
    : undefined;

  if (!host) {
    throw new Error(`W-P39 intake evidence does not contain host plan ${hostName}.`);
  }

  return host;
}

function findHostParity(hostParity, hostName) {
  const host = Array.isArray(hostParity.hostParity)
    ? hostParity.hostParity.find((candidate) => candidate.host === hostName)
    : undefined;

  if (!host) {
    throw new Error(`W-P38 host parity evidence does not contain host ${hostName}.`);
  }

  return host;
}

function createCaptureArtifacts() {
  return [
    {
      id: "extensions-page-loaded",
      kind: "screenshot",
      required: true,
      marker: "Unpacked HIA DevTools extension is loaded without requested permissions"
    },
    {
      id: "hia-devtools-panel-open",
      kind: "screenshot",
      required: true,
      marker: "Chrome DevTools shows the HIA panel"
    },
    {
      id: "review-surface-visible",
      kind: "screenshot",
      required: true,
      marker: "HIA panel renders relation and review payload summaries"
    },
    {
      id: "checked-apply-target-collaboration-visible",
      kind: "screenshot",
      required: true,
      marker: "Checked apply confirmation and target collaboration remain input-ready and write-disabled"
    },
    {
      id: "inspected-page-event-transcript",
      kind: "transcript",
      required: true,
      marker: "Inspected page receives hia:devtools-open-request without returning page data"
    }
  ];
}

function createManualChecklist(captureArtifacts) {
  return {
    title: "W-P39 DevTools Runtime Capture Checklist",
    host: "chrome-devtools-unpacked-extension",
    appDirectory: "apps/devtools-extension",
    steps: [
      "Open a clean shell at <main-repo>.",
      "Run pnpm run wp39:devtools-runtime-packet:evidence to refresh this packet.",
      "Open Chrome Extensions and enable Developer mode.",
      "Load the unpacked extension from <main-repo>/apps/devtools-extension.",
      "Open a disposable page and then open Chrome DevTools.",
      "Select the HIA panel.",
      "Confirm the panel renders relation and review payload summaries.",
      "Confirm checked apply confirmation and target collaboration are visible as input-ready but write-disabled.",
      "Trigger a structured open request and record the inspected page event transcript.",
      "Confirm no host permissions, source bodies, credentials or target repository writes are involved.",
      "Fill the capture report template and keep actual capture status separate from this prepared packet."
    ],
    captureArtifacts
  };
}

function createCaptureReportTemplate(captureArtifacts) {
  return {
    title: "W-P39 DevTools Runtime Capture Report Template",
    sections: [
      "Environment",
      "Loaded Extension",
      "Captured Artifacts",
      "Observed Panel Markers",
      "Inspected Page Event",
      "Permission And Write Authority Confirmation",
      "Privacy Confirmation",
      "Result",
      "Follow-Up"
    ],
    requiredArtifactIds: captureArtifacts.map((artifact) => artifact.id),
    resultOptions: [
      "captured",
      "blocked",
      "needs-rerun"
    ],
    forbiddenInReport: [
      "source body",
      "absolute local path",
      "credential material",
      "target repository write",
      "page data returned to the panel"
    ]
  };
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

function renderChecklistMarkdown(checklist) {
  const lines = [
    `# ${checklist.title}`,
    "",
    `Host: \`${checklist.host}\``,
    `App directory: \`${checklist.appDirectory}\``,
    "",
    "## Steps",
    ""
  ];

  checklist.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  lines.push("");
  lines.push("## Required Artifacts");
  lines.push("");

  for (const artifact of checklist.captureArtifacts) {
    lines.push(`- \`${artifact.id}\` (${artifact.kind}): ${artifact.marker}`);
  }

  lines.push("");
  lines.push("This checklist prepares manual runtime evidence only. It does not mark the capture as complete.");
  return `${lines.join("\n")}\n`;
}

function renderCaptureReportTemplateMarkdown(template) {
  const lines = [
    `# ${template.title}`,
    "",
    "Result: captured | blocked | needs-rerun",
    ""
  ];

  for (const section of template.sections) {
    lines.push(`## ${section}`);
    lines.push("");
    lines.push("- ");
    lines.push("");
  }

  lines.push("## Required Artifact IDs");
  lines.push("");

  for (const artifactId of template.requiredArtifactIds) {
    lines.push(`- \`${artifactId}\``);
  }

  lines.push("");
  lines.push("## Forbidden In Report");
  lines.push("");

  for (const forbidden of template.forbiddenInReport) {
    lines.push(`- ${forbidden}`);
  }

  return `${lines.join("\n")}\n`;
}
