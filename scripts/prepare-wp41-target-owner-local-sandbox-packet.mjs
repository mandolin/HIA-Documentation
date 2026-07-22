import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp41-target-owner-local-sandbox-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const packetPath = path.join(outputRoot, "target-owner-local-sandbox-packet.md");
const commandSheetPath = path.join(outputRoot, "target-owner-local-sandbox-commands.md");
const evidenceTemplatePath = path.join(outputRoot, "target-owner-local-sandbox-evidence-template.md");
const intakeEvidencePath = path.join(rootDir, "dist", "wp41-target-owner-flow-intake", "evidence.json");

await main();

/**
 * 准备 W-P41.2 target-owner local sandbox packet evidence。
 * Prepare W-P41.2 target-owner local sandbox packet evidence.
 *
 * This packet gives target owners a copy-only local sandbox workflow, command
 * sheet and evidence template. HIA automation does not create that sandbox,
 * run those commands or write a target repository; it only publishes the
 * instructions and public-safe verification metadata.
 *
 * 中文：本 packet 为目标 owner 准备 copy-only local sandbox 工作流、命令单和
 * evidence 模板。HIA automation 不创建该 sandbox、不运行这些命令，也不写目标
 * 仓库；它只发布说明和可公开验证的元数据。
 *
 * @returns {Promise<void>} Writes public-safe W-P41.2 evidence and sandbox packet docs.
 */
async function main() {
  const intakeEvidence = await readJson(intakeEvidencePath);
  const sandboxPolicy = createSandboxPolicy(intakeEvidence);
  const commandSheet = createTargetOwnerCommands();
  const artifactPlan = createCandidateArtifactPlan();
  const evidenceTemplate = createEvidenceTemplate();
  const cleanupChecklist = createCleanupChecklist();
  const summary = summarize(intakeEvidence, sandboxPolicy, commandSheet, artifactPlan, evidenceTemplate, cleanupChecklist);
  const checks = [
    check("HIA_WP41_LOCAL_SANDBOX_INTAKE_READY", summary.intakeReady === true
      && summary.intakeHardFailureCount === 0
      && summary.targetOwnerActionRequired === true
      && summary.intakeCandidatePacketCount >= 4, {
      actual: {
        intakeCandidatePacketCount: summary.intakeCandidatePacketCount,
        intakeHardFailureCount: summary.intakeHardFailureCount,
        intakeReady: summary.intakeReady,
        targetOwnerActionRequired: summary.targetOwnerActionRequired
      }
    }),
    check("HIA_WP41_LOCAL_SANDBOX_PACKET_PREPARED", summary.localSandboxPacketPrepared === true
      && summary.copyOnlyArtifactPlan === true
      && summary.commandSkeletonCount >= 6
      && summary.evidenceTemplateSectionCount >= 8
      && summary.cleanupChecklistStepCount >= 5, {
      actual: {
        cleanupChecklistStepCount: summary.cleanupChecklistStepCount,
        commandSkeletonCount: summary.commandSkeletonCount,
        copyOnlyArtifactPlan: summary.copyOnlyArtifactPlan,
        evidenceTemplateSectionCount: summary.evidenceTemplateSectionCount,
        localSandboxPacketPrepared: summary.localSandboxPacketPrepared
      }
    }),
    check("HIA_WP41_LOCAL_SANDBOX_TARGET_OWNER_ONLY", summary.targetOwnerMayCreateSandbox === true
      && summary.targetOwnerMayRunCommands === true
      && summary.hiaMayCreateTargetSandbox === false
      && summary.hiaMayRunTargetCommands === false
      && summary.hiaMayModifyTargetRepository === false
      && summary.hiaMayPushToTargetRemote === false, {
      actual: {
        hiaMayCreateTargetSandbox: summary.hiaMayCreateTargetSandbox,
        hiaMayModifyTargetRepository: summary.hiaMayModifyTargetRepository,
        hiaMayPushToTargetRemote: summary.hiaMayPushToTargetRemote,
        hiaMayRunTargetCommands: summary.hiaMayRunTargetCommands,
        targetOwnerMayCreateSandbox: summary.targetOwnerMayCreateSandbox,
        targetOwnerMayRunCommands: summary.targetOwnerMayRunCommands
      }
    }),
    check("HIA_WP41_LOCAL_SANDBOX_NO_EXECUTION_CLAIMED", summary.actualTargetSandboxCreated === false
      && summary.targetCommandsExecutedByHia === false
      && summary.targetOwnerExecutionClaimed === false
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        actualTargetSandboxCreated: summary.actualTargetSandboxCreated,
        directEditObjectCount: summary.directEditObjectCount,
        targetCommandsExecutedByHia: summary.targetCommandsExecutedByHia,
        targetOwnerExecutionClaimed: summary.targetOwnerExecutionClaimed,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP41_LOCAL_SANDBOX_PROVIDER_REVIEW_ONLY", summary.providerOutputReviewOnly === true
      && summary.blockedProviderReviewShapeAccepted === true
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.checkedApplyTriggeredCount === 0
      && summary.directApplyAllowedCount === 0, {
      actual: {
        blockedProviderReviewShapeAccepted: summary.blockedProviderReviewShapeAccepted,
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        providerOutputReviewOnly: summary.providerOutputReviewOnly,
        providerResultProduced: summary.providerResultProduced,
        refusalResultProduced: summary.refusalResultProduced
      }
    }),
    check("HIA_WP41_LOCAL_SANDBOX_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.documentTextIncludedCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        documentTextIncludedCount: summary.documentTextIncludedCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp41-target-owner-local-sandbox-packet-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-target-owner-branch-pr-packet" : "blocked",
    sourceEvidence: {
      targetOwnerFlowIntake: normalizePath(intakeEvidencePath)
    },
    packetStatus: "ready-for-target-owner-copy-only-local-sandbox-review",
    sandboxPolicy,
    artifactPlan,
    commandSheet,
    evidenceTemplate,
    cleanupChecklist,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      localSandboxPacket: normalizePath(packetPath),
      commandSheet: normalizePath(commandSheetPath),
      evidenceTemplate: normalizePath(evidenceTemplatePath)
    },
    nextContractInputs: [
      {
        phase: "W-P41.3",
        topic: "target-owner-branch-pr-packet",
        status: "ready-input",
        targetOwnerActionRequired: true,
        reason: "A copy-only local sandbox packet now exists, so W-P41.3 can prepare target-owned branch and pull-request packet language."
      },
      {
        phase: "W-P41.4",
        topic: "target-owner-command-and-evidence-template",
        status: "ready-input",
        targetOwnerActionRequired: true,
        reason: "W-P41.2 defines initial command and evidence template sections that W-P41.4 can harden."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P41 target-owner local sandbox packet evidence");
  assert.equal(hardFailures.length, 0, `W-P41 target-owner local sandbox packet has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(packetPath, renderSandboxPacketMarkdown(evidence), "utf8");
  await writeFile(commandSheetPath, renderCommandSheetMarkdown(evidence), "utf8");
  await writeFile(evidenceTemplatePath, renderEvidenceTemplateMarkdown(evidence), "utf8");
  console.log(`W-P41 target-owner local sandbox packet evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P41 target-owner local sandbox packet prepared at ${normalizePath(packetPath)}`);
  console.log(`W-P41 target-owner local sandbox commands prepared at ${normalizePath(commandSheetPath)}`);
  console.log(`W-P41 target-owner local sandbox evidence template prepared at ${normalizePath(evidenceTemplatePath)}`);
}

function createSandboxPolicy(intakeEvidence) {
  return {
    contract: "hia-wp41-target-owner-local-sandbox-policy",
    contractVersion: "0.1.0-draft",
    sourcePolicy: intakeEvidence.policy?.contract,
    targetOwnerActionRequired: true,
    targetOwnerMayCreateSandbox: true,
    targetOwnerMayRunCommands: true,
    hiaMayCreateTargetSandbox: false,
    hiaMayRunTargetCommands: false,
    hiaMayModifyTargetRepository: false,
    hiaMayPushToTargetRemote: false,
    localSandboxMode: "copy-only-target-owner-controlled",
    recommendedSandboxLocation: "outside-canonical-repository-history",
    providerOutputPolicy: "review-only",
    sourcesContentPolicy: "none"
  };
}

function createTargetOwnerCommands() {
  return [
    command("choose-sandbox-root", "Select a target-owner-controlled sandbox root outside canonical repository history.", "$SandboxRoot = \"<target-owner-controlled-sandbox>\""),
    command("create-sandbox-root", "Create the sandbox root.", "New-Item -ItemType Directory -Force -Path $SandboxRoot"),
    command("copy-target-project", "Copy or clone the target project into the sandbox under target-owner control.", "Copy-Item -Recurse -LiteralPath \"<target-project-working-copy>\" -Destination \"$SandboxRoot/project\""),
    command("copy-hia-candidate", "Copy HIA candidate artifacts into a separate review directory.", "Copy-Item -Recurse -LiteralPath \"<hia-candidate-artifacts>\" -Destination \"$SandboxRoot/hia-candidate\""),
    command("run-target-check", "Run the target project's documented documentation check command if it exists.", "Set-Location \"$SandboxRoot/project\"; <target-owner-documentation-check-command>"),
    command("capture-evidence", "Record command transcript and fill the W-P41 local sandbox evidence template.", "Set-Location \"$SandboxRoot\"; <capture-target-owner-evidence>"),
    command("cleanup-or-keep", "Either delete the sandbox or keep it for target-owner review.", "<target-owner-cleanup-or-archive-command>")
  ];
}

function command(id, purpose, template) {
  return {
    id,
    purpose,
    template,
    executedByHia: false,
    requiresTargetOwnerReview: true
  };
}

function createCandidateArtifactPlan() {
  return {
    contract: "hia-wp41-local-sandbox-candidate-artifact-plan",
    contractVersion: "0.1.0-draft",
    copyOnlyArtifactPlan: true,
    artifactGroups: [
      artifactGroup("policy", "Target-owner action policy and W-P41.1 intake summary."),
      artifactGroup("review-payload", "Review-only provider result/refusal handoff metadata."),
      artifactGroup("commands", "Target-owner local sandbox command sheet."),
      artifactGroup("evidence-template", "Target-owner execution report template."),
      artifactGroup("cleanup", "Rollback, cleanup or archive checklist.")
    ],
    mayContainDocumentText: false,
    mayContainCredentialMaterial: false,
    mayContainDirectEdits: false
  };
}

function artifactGroup(id, purpose) {
  return {
    id,
    purpose,
    copyOnly: true,
    generatedByHia: true,
    executedByHia: false
  };
}

function createEvidenceTemplate() {
  return {
    contract: "hia-wp41-local-sandbox-evidence-template",
    contractVersion: "0.1.0-draft",
    sections: [
      templateSection("sandbox-owner", "Target owner and reviewer identity label."),
      templateSection("sandbox-location-policy", "Whether the sandbox stayed outside canonical repository history."),
      templateSection("candidate-artifacts-reviewed", "Which HIA candidate artifacts were reviewed."),
      templateSection("commands-run", "Target-owner command transcript summary."),
      templateSection("documentation-output", "Generated documentation artifact summary without embedding document text."),
      templateSection("checks", "Target project check result summary."),
      templateSection("issues-or-blockers", "Warnings, failures or blockers observed by the target owner."),
      templateSection("adoption-decision", "Keep sandbox only, prepare branch, prepare PR, or reject."),
      templateSection("privacy-confirmation", "Confirmation that no credential, local absolute path or document text was copied into public evidence.")
    ]
  };
}

function templateSection(id, purpose) {
  return {
    id,
    purpose,
    required: true
  };
}

function createCleanupChecklist() {
  return [
    cleanupStep("no-credentials-copied", "Confirm no credentials or private keys were copied into the sandbox artifacts."),
    cleanupStep("no-public-document-text", "Confirm public evidence does not embed target document text."),
    cleanupStep("sandbox-outside-history", "Confirm sandbox outputs were not committed to canonical target history by HIA."),
    cleanupStep("review-target-owner-decision", "Record whether the target owner keeps, archives or deletes the sandbox."),
    cleanupStep("prepare-next-flow", "If approved, prepare W-P41.3 target-owned branch or pull-request packet.")
  ];
}

function cleanupStep(id, purpose) {
  return {
    id,
    purpose,
    targetOwnerActionRequired: true,
    executedByHia: false
  };
}

function summarize(intakeEvidence, sandboxPolicy, commandSheet, artifactPlan, evidenceTemplate, cleanupChecklist) {
  const packetSurface = {
    sandboxPolicy,
    commandSheet,
    artifactPlan,
    evidenceTemplate,
    cleanupChecklist
  };
  return {
    intakeReady: intakeEvidence.status === "ready-for-target-owner-local-sandbox-packet",
    intakeHardFailureCount: Number(intakeEvidence.summary?.hardFailureCount ?? -1),
    intakeCandidatePacketCount: Number(intakeEvidence.summary?.candidatePacketCount ?? 0),
    targetOwnerActionRequired: sandboxPolicy.targetOwnerActionRequired,
    localSandboxPacketPrepared: true,
    copyOnlyArtifactPlan: artifactPlan.copyOnlyArtifactPlan,
    artifactGroupCount: artifactPlan.artifactGroups.length,
    commandSkeletonCount: commandSheet.length,
    evidenceTemplateSectionCount: evidenceTemplate.sections.length,
    cleanupChecklistStepCount: cleanupChecklist.length,
    targetOwnerMayCreateSandbox: sandboxPolicy.targetOwnerMayCreateSandbox,
    targetOwnerMayRunCommands: sandboxPolicy.targetOwnerMayRunCommands,
    hiaMayCreateTargetSandbox: sandboxPolicy.hiaMayCreateTargetSandbox,
    hiaMayRunTargetCommands: sandboxPolicy.hiaMayRunTargetCommands,
    hiaMayModifyTargetRepository: sandboxPolicy.hiaMayModifyTargetRepository,
    hiaMayPushToTargetRemote: sandboxPolicy.hiaMayPushToTargetRemote,
    actualTargetSandboxCreated: false,
    targetCommandsExecutedByHia: false,
    targetOwnerExecutionClaimed: false,
    providerOutputReviewOnly: intakeEvidence.summary?.providerOutputReviewOnly === true,
    blockedProviderReviewShapeAccepted: intakeEvidence.summary?.blockedProviderReviewShapeAccepted === true,
    providerResultProduced: intakeEvidence.summary?.providerResultProduced === true,
    refusalResultProduced: intakeEvidence.summary?.refusalResultProduced === true,
    checkedApplyTriggeredCount: Number(intakeEvidence.summary?.checkedApplyTriggeredCount ?? 0),
    directApplyAllowedCount: Number(intakeEvidence.summary?.directApplyAllowedCount ?? 0),
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects(packetSurface),
    credentialValueIncludedCount: 0,
    sourceReferenceIncludedCount: 0,
    documentTextIncludedCount: 0,
    sourcesContentPolicy: sandboxPolicy.sourcesContentPolicy,
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(packetSurface),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(packetSurface),
    pathExposureCount: countPathExposure(JSON.stringify(packetSurface))
  };
}

function renderSandboxPacketMarkdown(evidence) {
  return `# W-P41.2 Target-Owner Local Sandbox Packet

## Status

- Evidence status: \`${evidence.status}\`
- Packet status: \`${evidence.packetStatus}\`
- Next phase: \`W-P41.3 target-owner-branch-pr-packet\`

## Boundary

- Target owner action required: ${String(evidence.summary.targetOwnerActionRequired)}
- HIA creates sandbox: ${String(evidence.summary.hiaMayCreateTargetSandbox)}
- HIA runs target commands: ${String(evidence.summary.hiaMayRunTargetCommands)}
- HIA writes target repository: ${String(evidence.summary.hiaMayModifyTargetRepository)}
- Actual sandbox created in this evidence: ${String(evidence.summary.actualTargetSandboxCreated)}

## Artifact Plan

${evidence.artifactPlan.artifactGroups.map((group) => `- \`${group.id}\`: ${group.purpose}`).join("\n")}

## Commands

See \`${evidence.generatedDocs.commandSheet}\`.

## Evidence Template

See \`${evidence.generatedDocs.evidenceTemplate}\`.
`;
}

function renderCommandSheetMarkdown(evidence) {
  return `# Target-Owner Local Sandbox Commands

These commands are templates for the target owner. HIA automation did not run them.

${evidence.commandSheet.map((item, index) => `${index + 1}. ${item.purpose}

\`\`\`powershell
${item.template}
\`\`\``).join("\n\n")}
`;
}

function renderEvidenceTemplateMarkdown(evidence) {
  return `# Target-Owner Local Sandbox Evidence Template

Fill this template only after the target owner runs the local sandbox commands.

${evidence.evidenceTemplate.sections.map((section) => `## ${section.id}

${section.purpose}

- Result:
- Notes:`).join("\n\n")}
`;
}

function check(code, passed, details) {
  return {
    code,
    status: passed ? "pass" : "fail",
    ...details
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function countDirectEditObjects(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(workspaceEdit|documentChanges|TextEdit|WorkspaceEdit|applyEdit)\b/g);
}

function countCredentialMaterialMarkers(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(apiKey|accessToken|authorizationHeader|secretValue|privateKey)\b/g);
}

function countForbiddenDocumentTextMarkers(value) {
  const text = JSON.stringify(value);
  return countMatches(text, /\b(sourcesContent|documentText|sourceExcerptText|fullSourceText)\b/g);
}

function countPathExposure(text) {
  const withoutUrls = text.replace(/https?:\/\//gi, "");
  return countMatches(withoutUrls, /(?:^|[^A-Za-z])(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|var|tmp|mnt)\/)/g);
}

function countMatches(text, pattern) {
  return Array.from(text.matchAll(pattern)).length;
}

function assertNoPrivateMarkers(serializedEvidence, label) {
  assert.equal(countPathExposure(serializedEvidence), 0, `${label} must not expose absolute local paths.`);
  assert.equal(countMatches(serializedEvidence, /\b(work-zone|ai\/codex|\.pem|npm_\w+|ghp_)\b/gi), 0, `${label} must not expose private workspace or secret markers.`);
}
