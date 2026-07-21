import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp39-visual-studio-runtime-preparation");
const evidencePath = path.join(outputRoot, "evidence.json");
const routeDecisionPath = path.join(outputRoot, "visual-studio-runtime-route-decision.md");
const manualChecklistPath = path.join(outputRoot, "manual-visual-studio-runtime-preparation-checklist.md");
const intakePath = path.join(rootDir, "dist", "wp39-host-runtime-capture-intake", "evidence.json");
const hostParityPath = path.join(rootDir, "dist", "wp38-devtools-visual-studio-confirmation-parity", "evidence.json");
const visualStudioCheckPath = path.join(rootDir, "dist", "visual-studio-extension-check.json");
const packagePath = path.join(rootDir, "apps", "visual-studio-extension", "package.json");
const readmePath = path.join(rootDir, "apps", "visual-studio-extension", "README.md");
const hostContractPath = path.join(rootDir, "apps", "visual-studio-extension", "host-contract.json");
const reviewSurfacePath = path.join(rootDir, "apps", "visual-studio-extension", "review-surface.json");

await main();

/**
 * 准备 W-P39.4 Visual Studio runtime preparation evidence。
 * Prepare W-P39.4 Visual Studio runtime preparation evidence.
 *
 * The Visual Studio host is still a skeleton, so this script selects the safe
 * near-term route, records the VSIX and experimental-instance prerequisites,
 * and verifies that no real Visual Studio runtime capture is claimed.
 *
 * 中文：Visual Studio 宿主目前仍是 skeleton，因此本脚本选择短期安全路线，
 * 记录 VSIX 与 experimental instance 的前置条件，并验证不会误称已经完成真实
 * Visual Studio runtime capture。
 *
 * @returns {Promise<void>} Writes public-safe evidence and manual preparation docs.
 */
async function main() {
  const intake = await readJson(intakePath);
  const hostParity = await readJson(hostParityPath);
  const visualStudioCheck = await readJson(visualStudioCheckPath);
  const packageJson = await readJson(packagePath);
  const hostContract = await readJson(hostContractPath);
  const reviewSurface = await readJson(reviewSurfacePath);
  const readme = await readFile(readmePath, "utf8");
  const visualStudioHostPlan = findHostPlan(intake, "visual-studio-extension-skeleton");
  const visualStudioParity = findHostParity(hostParity, "visual-studio");
  const routeDecision = createRuntimeRouteDecision(hostContract);
  const manualChecklist = createManualChecklist(routeDecision);
  const preparationPacket = {
    host: "visual-studio-extension-skeleton",
    packetStatus: "ready-for-visual-studio-runtime-route-followup",
    sourceInput: "W-P39.1",
    appDirectory: "apps/visual-studio-extension",
    nearTermRoute: routeDecision.selectedNearTermRoute,
    laterImplementationRoute: routeDecision.laterImplementationRoute,
    routeDecision: normalizePath(routeDecisionPath),
    manualChecklist: normalizePath(manualChecklistPath),
    actualRuntimeCaptureExecuted: false,
    visualStudioExtensionPackageBuilt: false,
    experimentalInstanceExecuted: false,
    vsixPublished: false,
    checkedApplyAvailable: false,
    workspaceWriteAllowed: false,
    targetRepositoryMutationAllowed: false,
    providerOwnedApplyAllowed: false,
    lspServerOwnedApplyAllowed: false,
    sourceBodyAllowedInPreparationReport: false,
    sourcesContentPolicy: "none"
  };
  const summary = {
    intakeReady: intake.status === "ready-for-wp39-host-runtime-capture-baseline",
    intakeHardFailureCount: Number(intake.summary?.hardFailureCount ?? -1),
    cycleGroupId: intake.summary?.cycleGroupId,
    visualStudioHostPlanStatus: visualStudioHostPlan.status,
    hostParityReady: hostParity.status === "ready-for-wp38-closeout-and-next-inputs",
    hostParityHardFailureCount: Number(hostParity.summary?.hardFailureCount ?? -1),
    visualStudioParityStatus: visualStudioParity.status,
    visualStudioCheckReady: visualStudioCheck.contract === "hia-visual-studio-extension-check",
    hostContractStatus: hostContract.status,
    appDirectory: hostContract.appDirectory,
    packagePrivate: packageJson.private === true,
    runtimePreparationStatus: hostContract.runtime?.preparationStatus,
    actualRuntimeCaptureExecuted: hostContract.runtime?.actualVisualStudioRuntimeCaptureExecuted === true
      || preparationPacket.actualRuntimeCaptureExecuted === true,
    visualStudioExtensionPackageBuilt: hostContract.runtime?.visualStudioExtensionPackageBuilt === true,
    experimentalInstanceExecuted: hostContract.runtime?.experimentalInstanceExecuted === true,
    dependencyLicenseAuditRequiredBeforeVsix: hostContract.runtime?.dependencyLicenseAuditRequiredBeforeVsix === true,
    languageServerPackage: hostContract.runtime?.languageServer?.package,
    cliPackage: hostContract.runtime?.cli?.package,
    readmeNamesVisualStudioExtensibility: /VisualStudio\.Extensibility/u.test(readme),
    readmeNamesVsixBoundary: /VSIX packaging/u.test(readme),
    reviewSurfaceReady: reviewSurface.status === "input-candidate",
    providerReviewReady: reviewSurface.providerReview?.status === "input-ready",
    applyPreviewReady: reviewSurface.applyPreview?.status === "input-ready",
    checkedApplyConfirmationReady: reviewSurface.checkedApplyConfirmation?.status === "input-ready",
    targetCollaborationReady: reviewSurface.targetCollaboration?.status === "input-ready",
    routeDecisionStatus: routeDecision.status,
    routeCandidateCount: routeDecision.candidates.length,
    routeDependencyAuditRequiredCount: routeDecision.candidates.filter((candidate) => candidate.dependencyLicenseAuditRequired === true).length,
    routeCurrentRouteCount: routeDecision.candidates.filter((candidate) => candidate.currentPhase === true).length,
    manualChecklistStepCount: manualChecklist.steps.length,
    preparationPacketStatus: preparationPacket.packetStatus,
    checkedApplyAvailable: preparationPacket.checkedApplyAvailable,
    workspaceApplyEditCallCount: 0,
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    targetRepositoryWriteAttemptedCount: 0,
    providerOwnedApplyCount: 0,
    lspServerOwnedApplyCount: 0,
    directApplyAllowedCount: 0,
    directEditObjectCount: countDirectEditObjects({ preparationPacket, routeDecision, manualChecklist }),
    pathExposureCount: countPathExposureValues({ preparationPacket, routeDecision, manualChecklist }),
    sourceBodyIncludedInEvidence: false,
    sourcesContentPolicy: "none"
  };
  const checks = [
    check("HIA_WP39_VISUAL_STUDIO_PREP_INPUTS_READY", summary.intakeReady === true
      && summary.intakeHardFailureCount === 0
      && summary.cycleGroupId === "C-HIA-P1"
      && summary.visualStudioHostPlanStatus === "runtime-prep-required"
      && summary.hostParityReady === true
      && summary.hostParityHardFailureCount === 0
      && summary.visualStudioParityStatus === "input-ready"
      && summary.visualStudioCheckReady === true, {
      actual: {
        cycleGroupId: summary.cycleGroupId,
        hostParityHardFailureCount: summary.hostParityHardFailureCount,
        hostParityStatus: hostParity.status,
        intakeHardFailureCount: summary.intakeHardFailureCount,
        intakeStatus: intake.status,
        visualStudioCheckContract: visualStudioCheck.contract,
        visualStudioHostPlanStatus: summary.visualStudioHostPlanStatus,
        visualStudioParityStatus: summary.visualStudioParityStatus
      }
    }),
    check("HIA_WP39_VISUAL_STUDIO_PREP_SKELETON_READY", summary.hostContractStatus === "skeleton"
      && summary.appDirectory === "apps/visual-studio-extension"
      && summary.packagePrivate === true
      && summary.languageServerPackage === "@hia-doc/lsp"
      && summary.cliPackage === "@hia-doc/cli"
      && summary.runtimePreparationStatus === "contract-level-runtime-prep", {
      actual: {
        appDirectory: summary.appDirectory,
        cliPackage: summary.cliPackage,
        hostContractStatus: summary.hostContractStatus,
        languageServerPackage: summary.languageServerPackage,
        packagePrivate: summary.packagePrivate,
        runtimePreparationStatus: summary.runtimePreparationStatus
      }
    }),
    check("HIA_WP39_VISUAL_STUDIO_PREP_ROUTE_SELECTED", summary.routeDecisionStatus === "route-selected-for-preparation"
      && routeDecision.selectedNearTermRoute === "contract-level-runtime-prep"
      && routeDecision.laterImplementationRoute === "visualstudio-extensibility-or-vssdk-vsix-after-audit"
      && summary.routeCandidateCount >= 3
      && summary.routeDependencyAuditRequiredCount >= 2
      && summary.routeCurrentRouteCount === 1
      && summary.dependencyLicenseAuditRequiredBeforeVsix === true
      && summary.readmeNamesVisualStudioExtensibility === true
      && summary.readmeNamesVsixBoundary === true, {
      actual: {
        dependencyLicenseAuditRequiredBeforeVsix: summary.dependencyLicenseAuditRequiredBeforeVsix,
        laterImplementationRoute: routeDecision.laterImplementationRoute,
        readmeNamesVisualStudioExtensibility: summary.readmeNamesVisualStudioExtensibility,
        readmeNamesVsixBoundary: summary.readmeNamesVsixBoundary,
        routeCandidateCount: summary.routeCandidateCount,
        routeCurrentRouteCount: summary.routeCurrentRouteCount,
        routeDependencyAuditRequiredCount: summary.routeDependencyAuditRequiredCount,
        selectedNearTermRoute: routeDecision.selectedNearTermRoute
      }
    }),
    check("HIA_WP39_VISUAL_STUDIO_PREP_REVIEW_SURFACE_READY", summary.reviewSurfaceReady === true
      && summary.providerReviewReady === true
      && summary.applyPreviewReady === true
      && summary.checkedApplyConfirmationReady === true
      && summary.targetCollaborationReady === true, {
      actual: {
        applyPreviewReady: summary.applyPreviewReady,
        checkedApplyConfirmationReady: summary.checkedApplyConfirmationReady,
        providerReviewReady: summary.providerReviewReady,
        reviewSurfaceReady: summary.reviewSurfaceReady,
        targetCollaborationReady: summary.targetCollaborationReady
      }
    }),
    check("HIA_WP39_VISUAL_STUDIO_PREP_CAPTURE_NOT_CLAIMED", summary.actualRuntimeCaptureExecuted === false
      && summary.visualStudioExtensionPackageBuilt === false
      && summary.experimentalInstanceExecuted === false
      && preparationPacket.vsixPublished === false
      && summary.manualChecklistStepCount >= 8
      && summary.preparationPacketStatus === "ready-for-visual-studio-runtime-route-followup", {
      actual: {
        actualRuntimeCaptureExecuted: summary.actualRuntimeCaptureExecuted,
        experimentalInstanceExecuted: summary.experimentalInstanceExecuted,
        manualChecklistStepCount: summary.manualChecklistStepCount,
        preparationPacketStatus: summary.preparationPacketStatus,
        visualStudioExtensionPackageBuilt: summary.visualStudioExtensionPackageBuilt,
        vsixPublished: preparationPacket.vsixPublished
      }
    }),
    check("HIA_WP39_VISUAL_STUDIO_PREP_NO_WRITE_AUTHORITY", summary.checkedApplyAvailable === false
      && summary.workspaceApplyEditCallCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.targetRepositoryWriteAttemptedCount === 0
      && summary.providerOwnedApplyCount === 0
      && summary.lspServerOwnedApplyCount === 0
      && summary.directApplyAllowedCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyAvailable: summary.checkedApplyAvailable,
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
    check("HIA_WP39_VISUAL_STUDIO_PREP_PRIVACY_CLEAN", summary.pathExposureCount === 0
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
    contract: "hia-wp39-visual-studio-runtime-preparation-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-visual-studio-runtime-route-followup" : "blocked",
    sourceEvidence: {
      hostRuntimeCaptureIntake: normalizePath(intakePath),
      hostParity: normalizePath(hostParityPath),
      visualStudioExtensionCheck: normalizePath(visualStudioCheckPath),
      hostContract: "apps/visual-studio-extension/host-contract.json",
      reviewSurface: "apps/visual-studio-extension/review-surface.json"
    },
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    preparationPacket,
    routeDecision,
    manualChecklist,
    checks,
    nextContractInputs: [
      {
        phase: "W-P39.5",
        topic: "runtime-evidence-normalization",
        reason: "VS Code, DevTools and Visual Studio now have separate runtime packet states that can be normalized without claiming missing host captures."
      },
      {
        phase: "G-VS-P4/follow-up",
        topic: "visual-studio-vsix-implementation-choice",
        reason: "A future Visual Studio implementation must choose VisualStudio.Extensibility or traditional VSIX after dependency, license and install-surface audit."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P39 Visual Studio runtime preparation evidence");
  assert.equal(hardFailures.length, 0, `W-P39 Visual Studio preparation evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(routeDecisionPath, renderRouteDecisionMarkdown(routeDecision), "utf8");
  await writeFile(manualChecklistPath, renderChecklistMarkdown(manualChecklist), "utf8");
  console.log(`W-P39 Visual Studio runtime preparation evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`Visual Studio route decision prepared at ${normalizePath(routeDecisionPath)}`);
  console.log(`Manual checklist prepared at ${normalizePath(manualChecklistPath)}`);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read required JSON evidence at ${normalizePath(filePath)}: ${error.message}`);
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

function createRuntimeRouteDecision(hostContract) {
  return {
    status: "route-selected-for-preparation",
    selectedNearTermRoute: "contract-level-runtime-prep",
    laterImplementationRoute: "visualstudio-extensibility-or-vssdk-vsix-after-audit",
    rationale: [
      "Visual Studio is still a skeleton and should not be labeled as an installable package.",
      "The current HIA value is host contract, review surface and LSP/CLI boundary validation.",
      "A real VSIX route adds Visual Studio SDK, install surface and license-audit work that should be handled in a focused follow-up."
    ],
    candidates: [
      {
        id: "contract-level-runtime-prep",
        currentPhase: true,
        decision: "selected",
        purpose: "Keep Visual Studio aligned with VS Code and DevTools host contracts while runtime implementation remains pending.",
        producesManualRuntimeCapture: false,
        requiresVisualStudioInstall: false,
        dependencyLicenseAuditRequired: false,
        risk: "low"
      },
      {
        id: "visualstudio-extensibility-vsix",
        currentPhase: false,
        decision: "follow-up-candidate",
        purpose: "Use the newer VisualStudio.Extensibility model for commands and tool-window presentation when it becomes implementation work.",
        producesManualRuntimeCapture: true,
        requiresVisualStudioInstall: true,
        dependencyLicenseAuditRequired: true,
        risk: "medium"
      },
      {
        id: "vssdk-vsix-experimental-instance",
        currentPhase: false,
        decision: "follow-up-candidate",
        purpose: "Use traditional VS SDK and experimental instance runtime when native package behavior is required.",
        producesManualRuntimeCapture: true,
        requiresVisualStudioInstall: true,
        dependencyLicenseAuditRequired: true,
        risk: "medium"
      },
      {
        id: "manual-captured-fixture-from-future-vsix",
        currentPhase: false,
        decision: "defer-until-real-vsix",
        purpose: "Archive screenshots and transcripts after a real extension package exists.",
        producesManualRuntimeCapture: true,
        requiresVisualStudioInstall: true,
        dependencyLicenseAuditRequired: true,
        risk: "medium"
      }
    ],
    runtimeBoundaries: {
      hostRunsDocumentationProducers: hostContract.privacy?.runsDocumentationProducers === true,
      hostParsesGeneratedHtml: hostContract.privacy?.parsesGeneratedHtml === true,
      hostEmbedsSourcesContent: hostContract.privacy?.embedsSourcesContent === true,
      hostAllowsAutomaticApply: hostContract.privacy?.allowsAutomaticApply === true,
      hostAllowsTargetMutation: hostContract.privacy?.allowTargetRepositoryMutation === true
    }
  };
}

function createManualChecklist(routeDecision) {
  return {
    title: "W-P39 Visual Studio Runtime Preparation Checklist",
    host: "visual-studio-extension-skeleton",
    appDirectory: "apps/visual-studio-extension",
    selectedNearTermRoute: routeDecision.selectedNearTermRoute,
    steps: [
      "Refresh this packet with pnpm run wp39:visual-studio-runtime-prep:evidence.",
      "Confirm pnpm run visual-studio:check still passes before any runtime implementation work.",
      "Keep the current package private and dependency-free until a focused VSIX implementation phase starts.",
      "Choose VisualStudio.Extensibility or traditional VS SDK only after documenting the dependency and license surface.",
      "Use an isolated Visual Studio experimental instance for future real runtime capture.",
      "Record future screenshots and transcripts separately from this preparation packet.",
      "Do not claim actual Visual Studio runtime capture until a real extension package is launched.",
      "Keep checked apply unavailable and require human review for every proposal.",
      "Keep all target project changes outside HIA-owned automation.",
      "Do not include source bodies, credentials, absolute paths or private workspace paths in reports."
    ],
    forbiddenInReport: [
      "source body",
      "absolute local path",
      "credential material",
      "target repository write",
      "real runtime capture claim before a VSIX or equivalent package exists"
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

function renderRouteDecisionMarkdown(routeDecision) {
  const lines = [
    "# W-P39 Visual Studio Runtime Route Decision",
    "",
    `Status: \`${routeDecision.status}\``,
    `Selected near-term route: \`${routeDecision.selectedNearTermRoute}\``,
    `Later implementation route: \`${routeDecision.laterImplementationRoute}\``,
    "",
    "## Rationale",
    ""
  ];

  for (const item of routeDecision.rationale) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("## Candidates");
  lines.push("");

  for (const candidate of routeDecision.candidates) {
    lines.push(`- \`${candidate.id}\`: ${candidate.decision}; risk=${candidate.risk}; dependencyLicenseAuditRequired=${candidate.dependencyLicenseAuditRequired}`);
  }

  lines.push("");
  lines.push("This route decision prepares Visual Studio runtime work only. It does not claim a VSIX build or real Visual Studio runtime capture.");
  return `${lines.join("\n")}\n`;
}

function renderChecklistMarkdown(checklist) {
  const lines = [
    `# ${checklist.title}`,
    "",
    `Host: \`${checklist.host}\``,
    `App directory: \`${checklist.appDirectory}\``,
    `Selected near-term route: \`${checklist.selectedNearTermRoute}\``,
    "",
    "## Steps",
    ""
  ];

  checklist.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  lines.push("");
  lines.push("## Forbidden In Report");
  lines.push("");

  for (const forbidden of checklist.forbiddenInReport) {
    lines.push(`- ${forbidden}`);
  }

  lines.push("");
  lines.push("This checklist prepares Visual Studio runtime work only. It does not mark the capture as complete.");
  return `${lines.join("\n")}\n`;
}
