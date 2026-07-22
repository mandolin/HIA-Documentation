import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp41-target-owner-command-evidence-template");
const evidencePath = path.join(outputRoot, "evidence.json");
const transcriptTemplatePath = path.join(outputRoot, "target-owner-command-transcript-template.md");
const evidencePacketTemplatePath = path.join(outputRoot, "target-owner-evidence-packet-template.md");
const resultShapePath = path.join(outputRoot, "target-owner-result-shapes.md");
const branchPrEvidencePath = path.join(rootDir, "dist", "wp41-target-owner-branch-pr-packet", "evidence.json");
const localSandboxEvidencePath = path.join(rootDir, "dist", "wp41-target-owner-local-sandbox-packet", "evidence.json");

await main();

/**
 * 准备 W-P41.4 target-owner command transcript and evidence template。
 * Prepare W-P41.4 target-owner command transcript and evidence template.
 *
 * This stage consolidates the local sandbox and branch/PR command templates
 * into one target-owner evidence packet shape. It records no target execution,
 * no branch creation, no pull request and no repository write by HIA.
 *
 * 中文：本阶段将 local sandbox 与 branch/PR 命令模板收束为统一的目标 owner
 * evidence packet shape。它不记录 HIA 执行目标命令、创建分支、打开 PR 或写仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P41.4 evidence and templates.
 */
async function main() {
  const branchPrEvidence = await readJson(branchPrEvidencePath);
  const localSandboxEvidence = await readJson(localSandboxEvidencePath);
  const transcriptTemplate = createCommandTranscriptTemplate(localSandboxEvidence, branchPrEvidence);
  const evidencePacketTemplate = createEvidencePacketTemplate();
  const resultShapes = createResultShapes();
  const privacyChecklist = createPrivacyChecklist();
  const summary = summarize({
    branchPrEvidence,
    evidencePacketTemplate,
    localSandboxEvidence,
    privacyChecklist,
    resultShapes,
    transcriptTemplate
  });
  const checks = [
    check("HIA_WP41_COMMAND_EVIDENCE_INPUTS_READY", summary.localSandboxPacketReady === true
      && summary.branchPrPacketReady === true
      && summary.inputHardFailureCount === 0
      && summary.targetOwnerActionRequired === true, {
      actual: {
        branchPrPacketReady: summary.branchPrPacketReady,
        inputHardFailureCount: summary.inputHardFailureCount,
        localSandboxPacketReady: summary.localSandboxPacketReady,
        targetOwnerActionRequired: summary.targetOwnerActionRequired
      }
    }),
    check("HIA_WP41_COMMAND_EVIDENCE_TEMPLATE_PREPARED", summary.transcriptStepCount >= 16
      && summary.transcriptFieldCount >= 9
      && summary.evidencePacketSectionCount >= 12
      && summary.resultShapeCount >= 7
      && summary.privacyChecklistItemCount >= 7, {
      actual: {
        evidencePacketSectionCount: summary.evidencePacketSectionCount,
        privacyChecklistItemCount: summary.privacyChecklistItemCount,
        resultShapeCount: summary.resultShapeCount,
        transcriptFieldCount: summary.transcriptFieldCount,
        transcriptStepCount: summary.transcriptStepCount
      }
    }),
    check("HIA_WP41_COMMAND_EVIDENCE_TARGET_OWNER_ONLY", summary.targetOwnerMaySubmitEvidence === true
      && summary.hiaMayRunTargetCommands === false
      && summary.hiaMayCreateTargetBranch === false
      && summary.hiaMayOpenPullRequest === false
      && summary.hiaMayModifyTargetRepository === false
      && summary.hiaMayPushToTargetRemote === false, {
      actual: {
        hiaMayCreateTargetBranch: summary.hiaMayCreateTargetBranch,
        hiaMayModifyTargetRepository: summary.hiaMayModifyTargetRepository,
        hiaMayOpenPullRequest: summary.hiaMayOpenPullRequest,
        hiaMayPushToTargetRemote: summary.hiaMayPushToTargetRemote,
        hiaMayRunTargetCommands: summary.hiaMayRunTargetCommands,
        targetOwnerMaySubmitEvidence: summary.targetOwnerMaySubmitEvidence
      }
    }),
    check("HIA_WP41_COMMAND_EVIDENCE_NO_EXECUTION_CLAIMED", summary.actualCommandTranscriptSubmitted === false
      && summary.targetCommandsExecutedByHia === false
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestOpened === false
      && summary.targetOwnerExecutionClaimed === false
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        actualCommandTranscriptSubmitted: summary.actualCommandTranscriptSubmitted,
        actualPullRequestOpened: summary.actualPullRequestOpened,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        directEditObjectCount: summary.directEditObjectCount,
        targetCommandsExecutedByHia: summary.targetCommandsExecutedByHia,
        targetOwnerExecutionClaimed: summary.targetOwnerExecutionClaimed,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP41_COMMAND_EVIDENCE_PROVIDER_REVIEW_ONLY", summary.providerOutputReviewOnly === true
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
    check("HIA_WP41_COMMAND_EVIDENCE_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
      && summary.sourceReferenceIncludedCount === 0
      && summary.sourceTextIncludedCount === 0
      && summary.sourcesContentPolicy === "none"
      && summary.credentialMaterialMarkerCount === 0
      && summary.forbiddenDocumentTextMarkerCount === 0
      && summary.pathExposureCount === 0, {
      actual: {
        credentialMaterialMarkerCount: summary.credentialMaterialMarkerCount,
        credentialValueIncludedCount: summary.credentialValueIncludedCount,
        forbiddenDocumentTextMarkerCount: summary.forbiddenDocumentTextMarkerCount,
        pathExposureCount: summary.pathExposureCount,
        sourceReferenceIncludedCount: summary.sourceReferenceIncludedCount,
        sourceTextIncludedCount: summary.sourceTextIncludedCount,
        sourcesContentPolicy: summary.sourcesContentPolicy
      }
    })
  ];
  const hardFailures = checks.filter((item) => item.status === "fail");
  const evidence = {
    contract: "hia-wp41-target-owner-command-evidence-template",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-provider-review-payload-handoff" : "blocked",
    sourceEvidence: {
      targetOwnerBranchPrPacket: normalizePath(branchPrEvidencePath),
      targetOwnerLocalSandboxPacket: normalizePath(localSandboxEvidencePath)
    },
    templateStatus: "ready-for-target-owner-transcript-and-evidence-submission",
    transcriptTemplate,
    evidencePacketTemplate,
    resultShapes,
    privacyChecklist,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      transcriptTemplate: normalizePath(transcriptTemplatePath),
      evidencePacketTemplate: normalizePath(evidencePacketTemplatePath),
      resultShapes: normalizePath(resultShapePath)
    },
    nextContractInputs: [
      {
        phase: "W-P41.5",
        topic: "provider-review-payload-handoff",
        status: "ready-input",
        targetOwnerActionRequired: true,
        reason: "Command transcript and evidence packet shape are stable enough to attach review-only provider payload handoff."
      },
      {
        phase: "W-P41.6",
        topic: "target-owner-dry-run-evidence",
        status: "ready-after-wp41.5",
        targetOwnerActionRequired: true,
        reason: "Dry-run evidence can later validate the submitted transcript shape without HIA-owned target writes."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P41 target-owner command evidence template");
  assert.equal(hardFailures.length, 0, `W-P41 target-owner command evidence template has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(transcriptTemplatePath, renderTranscriptTemplate(evidence), "utf8");
  await writeFile(evidencePacketTemplatePath, renderEvidencePacketTemplate(evidence), "utf8");
  await writeFile(resultShapePath, renderResultShapes(evidence), "utf8");
  console.log(`W-P41 target-owner command evidence template prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P41 target-owner command transcript template prepared at ${normalizePath(transcriptTemplatePath)}`);
  console.log(`W-P41 target-owner evidence packet template prepared at ${normalizePath(evidencePacketTemplatePath)}`);
  console.log(`W-P41 target-owner result shapes prepared at ${normalizePath(resultShapePath)}`);
}

function createCommandTranscriptTemplate(localSandboxEvidence, branchPrEvidence) {
  const sandboxCommands = localSandboxEvidence.commandSheet ?? [];
  const branchPrCommands = branchPrEvidence.commandSheet ?? [];
  const steps = [...sandboxCommands, ...branchPrCommands].map((entry, index) => ({
    id: `step-${String(index + 1).padStart(2, "0")}`,
    sourceCommandId: entry.id,
    purpose: entry.purpose,
    template: entry.template,
    executedByHia: false,
    targetOwnerActionRequired: true
  }));
  return {
    contract: "hia-wp41-command-transcript-template",
    contractVersion: "0.1.0-draft",
    fields: [
      field("stepId", "Stable command step id."),
      field("sourceCommandId", "Original W-P41 command template id."),
      field("targetOwnerDecision", "run, skipped, blocked or replaced."),
      field("commandSummary", "Short command summary without sensitive values."),
      field("exitCode", "Command exit code if target owner ran it."),
      field("resultStatus", "success, warning, failure or blocked."),
      field("artifactSummary", "Generated artifact summary without source body."),
      field("evidenceReference", "Target-owner evidence reference label."),
      field("notes", "Target-owner notes.")
    ],
    steps
  };
}

function field(id, purpose) {
  return { id, purpose, required: true };
}

function createEvidencePacketTemplate() {
  return {
    contract: "hia-wp41-target-owner-evidence-packet-template",
    contractVersion: "0.1.0-draft",
    sections: [
      section("packet-metadata", "Target owner, target label, HIA packet version and date."),
      section("policy-confirmation", "Confirmation that target-owner action required policy was followed."),
      section("local-sandbox-summary", "Local sandbox status or blocked reason."),
      section("branch-pr-summary", "Branch and PR status or blocked reason."),
      section("command-transcript", "Command transcript table using the W-P41.4 field set."),
      section("check-results", "Documentation, build or CI check summaries."),
      section("provider-review-handoff", "Review-only provider payload handoff status."),
      section("privacy-check", "Privacy checklist results."),
      section("failure-blocker-shape", "Failure, blocked or rejected result details."),
      section("adoption-decision", "Target owner adoption decision."),
      section("follow-up", "Follow-up owner and next action."),
      section("attachments", "Public-safe attachment labels only.")
    ]
  };
}

function section(id, purpose) {
  return { id, purpose, required: true };
}

function createResultShapes() {
  return [
    resultShape("not-run", "Target owner has not run the packet yet."),
    resultShape("sandbox-only-success", "Local sandbox succeeded, but no branch or PR was created."),
    resultShape("branch-ready", "Target owner prepared a branch but did not open a PR."),
    resultShape("pr-ready-for-review", "Target owner opened or prepared a PR for review."),
    resultShape("blocked-before-sandbox", "Packet was blocked before local sandbox work."),
    resultShape("blocked-before-branch", "Packet was blocked before branch creation."),
    resultShape("blocked-before-pr", "Packet was blocked before PR creation."),
    resultShape("rejected", "Target owner rejected the packet."),
    resultShape("follow-up-required", "Follow-up action is needed before adoption.")
  ];
}

function resultShape(id, meaning) {
  return {
    id,
    meaning,
    producedByHia: false,
    targetOwnerActionRequired: true
  };
}

function createPrivacyChecklist() {
  return [
    privacyItem("no-secret-values", "No secret values or private key material in public evidence."),
    privacyItem("no-source-body", "No source body or full document body in public evidence."),
    privacyItem("no-local-absolute-paths", "No local absolute paths in public evidence."),
    privacyItem("no-direct-edit-objects", "No direct editor objects in provider or evidence output."),
    privacyItem("no-provider-execution-claim", "No fake provider execution or network success claim."),
    privacyItem("review-only-provider-output", "Provider output remains review-only."),
    privacyItem("target-owner-execution-label", "Execution status labels distinguish target-owner action from HIA preparation.")
  ];
}

function privacyItem(id, purpose) {
  return {
    id,
    purpose,
    required: true
  };
}

function summarize({
  branchPrEvidence,
  evidencePacketTemplate,
  localSandboxEvidence,
  privacyChecklist,
  resultShapes,
  transcriptTemplate
}) {
  const templateSurface = {
    evidencePacketTemplate,
    privacyChecklist,
    resultShapes,
    transcriptTemplate
  };
  return {
    localSandboxPacketReady: localSandboxEvidence.status === "ready-for-target-owner-branch-pr-packet",
    branchPrPacketReady: branchPrEvidence.status === "ready-for-target-owner-command-evidence-template",
    inputHardFailureCount: Number(localSandboxEvidence.summary?.hardFailureCount ?? 0) + Number(branchPrEvidence.summary?.hardFailureCount ?? 0),
    targetOwnerActionRequired: true,
    transcriptStepCount: transcriptTemplate.steps.length,
    transcriptFieldCount: transcriptTemplate.fields.length,
    evidencePacketSectionCount: evidencePacketTemplate.sections.length,
    resultShapeCount: resultShapes.length,
    privacyChecklistItemCount: privacyChecklist.length,
    targetOwnerMaySubmitEvidence: true,
    hiaMayRunTargetCommands: false,
    hiaMayCreateTargetBranch: false,
    hiaMayOpenPullRequest: false,
    hiaMayModifyTargetRepository: false,
    hiaMayPushToTargetRemote: false,
    actualCommandTranscriptSubmitted: false,
    targetCommandsExecutedByHia: false,
    actualTargetBranchCreated: false,
    actualPullRequestOpened: false,
    targetOwnerExecutionClaimed: false,
    providerOutputReviewOnly: branchPrEvidence.summary?.providerOutputReviewOnly === true,
    blockedProviderReviewShapeAccepted: branchPrEvidence.summary?.blockedProviderReviewShapeAccepted === true,
    providerResultProduced: branchPrEvidence.summary?.providerResultProduced === true,
    refusalResultProduced: branchPrEvidence.summary?.refusalResultProduced === true,
    checkedApplyTriggeredCount: Number(branchPrEvidence.summary?.checkedApplyTriggeredCount ?? 0),
    directApplyAllowedCount: Number(branchPrEvidence.summary?.directApplyAllowedCount ?? 0),
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects(templateSurface),
    credentialValueIncludedCount: 0,
    sourceReferenceIncludedCount: 0,
    sourceTextIncludedCount: 0,
    sourcesContentPolicy: "none",
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(templateSurface),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(templateSurface),
    pathExposureCount: countPathExposure(JSON.stringify(templateSurface))
  };
}

function renderTranscriptTemplate(evidence) {
  return `# Target-Owner Command Transcript Template

HIA automation did not run these commands. Fill this template only after target-owner execution.

| Field | Purpose |
| --- | --- |
${evidence.transcriptTemplate.fields.map((entry) => `| \`${entry.id}\` | ${entry.purpose} |`).join("\n")}

## Steps

${evidence.transcriptTemplate.steps.map((entry) => `### ${entry.id}

- Source command id: \`${entry.sourceCommandId}\`
- Purpose: ${entry.purpose}
- Target-owner decision:
- Result status:
- Evidence reference:
`).join("\n")}
`;
}

function renderEvidencePacketTemplate(evidence) {
  return `# Target-Owner Evidence Packet Template

Fill this packet after target-owner execution, review or rejection.

${evidence.evidencePacketTemplate.sections.map((entry) => `## ${entry.id}

${entry.purpose}

- Result:
- Notes:`).join("\n\n")}
`;
}

function renderResultShapes(evidence) {
  return `# Target-Owner Result Shapes

${evidence.resultShapes.map((entry) => `## ${entry.id}

${entry.meaning}

- Produced by HIA: ${String(entry.producedByHia)}
- Target owner action required: ${String(entry.targetOwnerActionRequired)}
`).join("\n")}
`;
}

function check(code, passed, details) {
  return { code, status: passed ? "pass" : "fail", ...details };
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
