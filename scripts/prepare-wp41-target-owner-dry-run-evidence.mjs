import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp41-target-owner-dry-run-evidence");
const evidencePath = path.join(outputRoot, "evidence.json");
const readinessMatrixPath = path.join(outputRoot, "target-owner-dry-run-readiness-matrix.md");
const reviewChecklistPath = path.join(outputRoot, "target-owner-evidence-review-checklist.md");
const resultTemplatePath = path.join(outputRoot, "target-owner-dry-run-result-template.md");
const commandEvidencePath = path.join(rootDir, "dist", "wp41-target-owner-command-evidence-template", "evidence.json");
const handoffEvidencePath = path.join(rootDir, "dist", "wp41-provider-review-payload-handoff", "evidence.json");

await main();

/**
 * 准备 W-P41.6 target-owner dry-run/readiness evidence。
 * Prepare W-P41.6 target-owner dry-run/readiness evidence.
 *
 * This stage checks whether the target-owner packet has enough structure for a
 * later human-run dry-run result. It does not run target commands, create
 * branches or pull requests, execute providers, call networks, claim target
 * execution or mutate target repositories.
 *
 * 中文：本阶段检查 target-owner packet 是否具备后续真人 dry-run 回填所需的结构。
 * 它不运行目标命令、不创建分支或 PR、不执行 provider、不联网、不声称目标项目已执行，
 * 也不修改目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P41.6 readiness evidence and templates.
 */
async function main() {
  const commandEvidence = await readJson(commandEvidencePath);
  const handoffEvidence = await readJson(handoffEvidencePath);
  const readinessMatrix = createReadinessMatrix(commandEvidence, handoffEvidence);
  const evidenceReviewChecklist = createEvidenceReviewChecklist(commandEvidence, handoffEvidence);
  const dryRunResultTemplate = createDryRunResultTemplate(commandEvidence, handoffEvidence);
  const summary = summarize({
    commandEvidence,
    dryRunResultTemplate,
    evidenceReviewChecklist,
    handoffEvidence,
    readinessMatrix
  });
  const checks = [
    check("HIA_WP41_TARGET_OWNER_DRY_RUN_INPUTS_READY", summary.commandEvidenceTemplateReady === true
      && summary.providerReviewHandoffReady === true
      && summary.inputHardFailureCount === 0
      && summary.targetOwnerActionRequired === true, {
      actual: {
        commandEvidenceStatus: commandEvidence.status,
        handoffEvidenceStatus: handoffEvidence.status,
        inputHardFailureCount: summary.inputHardFailureCount,
        targetOwnerActionRequired: summary.targetOwnerActionRequired
      }
    }),
    check("HIA_WP41_TARGET_OWNER_DRY_RUN_MATRIX_READY", summary.readinessMatrixItemCount >= 10
      && summary.evidenceCompletenessCheckCount >= 12
      && summary.transcriptStepReviewCount >= 16
      && summary.handoffBindingReviewCount >= 6
      && summary.dryRunScenarioCount >= 4
      && summary.resultTemplateSectionCount >= 9, {
      actual: {
        dryRunScenarioCount: summary.dryRunScenarioCount,
        evidenceCompletenessCheckCount: summary.evidenceCompletenessCheckCount,
        handoffBindingReviewCount: summary.handoffBindingReviewCount,
        readinessMatrixItemCount: summary.readinessMatrixItemCount,
        resultTemplateSectionCount: summary.resultTemplateSectionCount,
        transcriptStepReviewCount: summary.transcriptStepReviewCount
      }
    }),
    check("HIA_WP41_TARGET_OWNER_DRY_RUN_TARGET_OWNER_ONLY", summary.targetOwnerMaySubmitDryRunEvidence === true
      && summary.hiaMayRunTargetCommands === false
      && summary.hiaMayCreateTargetSandbox === false
      && summary.hiaMayCreateTargetBranch === false
      && summary.hiaMayOpenPullRequest === false
      && summary.hiaMayPushToTargetRemote === false
      && summary.hiaMayModifyTargetRepository === false, {
      actual: {
        hiaMayCreateTargetBranch: summary.hiaMayCreateTargetBranch,
        hiaMayCreateTargetSandbox: summary.hiaMayCreateTargetSandbox,
        hiaMayModifyTargetRepository: summary.hiaMayModifyTargetRepository,
        hiaMayOpenPullRequest: summary.hiaMayOpenPullRequest,
        hiaMayPushToTargetRemote: summary.hiaMayPushToTargetRemote,
        hiaMayRunTargetCommands: summary.hiaMayRunTargetCommands,
        targetOwnerMaySubmitDryRunEvidence: summary.targetOwnerMaySubmitDryRunEvidence
      }
    }),
    check("HIA_WP41_TARGET_OWNER_DRY_RUN_NO_EXECUTION_CLAIMED", summary.actualDryRunExecuted === false
      && summary.actualCommandTranscriptSubmitted === false
      && summary.targetCommandsExecutedByHia === false
      && summary.actualTargetSandboxCreated === false
      && summary.actualTargetBranchCreated === false
      && summary.actualPullRequestOpened === false
      && summary.targetOwnerExecutionClaimed === false, {
      actual: {
        actualCommandTranscriptSubmitted: summary.actualCommandTranscriptSubmitted,
        actualDryRunExecuted: summary.actualDryRunExecuted,
        actualPullRequestOpened: summary.actualPullRequestOpened,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        actualTargetSandboxCreated: summary.actualTargetSandboxCreated,
        targetCommandsExecutedByHia: summary.targetCommandsExecutedByHia,
        targetOwnerExecutionClaimed: summary.targetOwnerExecutionClaimed
      }
    }),
    check("HIA_WP41_TARGET_OWNER_DRY_RUN_PROVIDER_REVIEW_ONLY", summary.providerOutputReviewOnly === true
      && summary.blockedProviderReviewShapeAccepted === true
      && summary.providerResultProduced === false
      && summary.refusalResultProduced === true
      && summary.externalNetworkCallExecuted === false
      && summary.realRemoteProviderInvocationExecuted === false, {
      actual: {
        blockedProviderReviewShapeAccepted: summary.blockedProviderReviewShapeAccepted,
        externalNetworkCallExecuted: summary.externalNetworkCallExecuted,
        providerOutputReviewOnly: summary.providerOutputReviewOnly,
        providerResultProduced: summary.providerResultProduced,
        realRemoteProviderInvocationExecuted: summary.realRemoteProviderInvocationExecuted,
        refusalResultProduced: summary.refusalResultProduced
      }
    }),
    check("HIA_WP41_TARGET_OWNER_DRY_RUN_NO_APPLY_OR_WRITE", summary.directApplyAllowedCount === 0
      && summary.checkedApplyTriggeredCount === 0
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        checkedApplyTriggeredCount: summary.checkedApplyTriggeredCount,
        directApplyAllowedCount: summary.directApplyAllowedCount,
        directEditObjectCount: summary.directEditObjectCount,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP41_TARGET_OWNER_DRY_RUN_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
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
    contract: "hia-wp41-target-owner-dry-run-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-wp41-closeout-and-wp42-wp43-inputs" : "blocked",
    sourceEvidence: {
      targetOwnerCommandEvidenceTemplate: normalizePath(commandEvidencePath),
      providerReviewPayloadHandoff: normalizePath(handoffEvidencePath)
    },
    dryRunStatus: "readiness-matrix-prepared-no-target-execution",
    readinessMatrix,
    evidenceReviewChecklist,
    dryRunResultTemplate,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      readinessMatrix: normalizePath(readinessMatrixPath),
      evidenceReviewChecklist: normalizePath(reviewChecklistPath),
      dryRunResultTemplate: normalizePath(resultTemplatePath)
    },
    nextContractInputs: [
      {
        phase: "W-P41.7",
        topic: "closeout-and-wp42-wp43-inputs",
        status: "ready-input",
        targetOwnerActionRequired: true,
        reason: "Target-owner readiness matrix is prepared without target execution claims or HIA-owned target writes."
      },
      {
        phase: "W-P42",
        topic: "checked-apply-contract-hardening",
        status: "target-owner-readiness-input",
        targetOwnerActionRequired: true,
        reason: "Dry-run evidence clarifies where checked apply must remain separated from provider review and target-owner execution."
      },
      {
        phase: "W-P43",
        topic: "host-owned-apply-ux-and-provider-review-linkage",
        status: "host-display-input-ready",
        targetOwnerActionRequired: false,
        reason: "Readiness, review-only handoff and target-owner result templates can be displayed by host UX without apply authority."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P41 target-owner dry-run evidence");
  assert.equal(hardFailures.length, 0, `W-P41 target-owner dry-run evidence has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(readinessMatrixPath, renderReadinessMatrix(evidence), "utf8");
  await writeFile(reviewChecklistPath, renderEvidenceReviewChecklist(evidence), "utf8");
  await writeFile(resultTemplatePath, renderDryRunResultTemplate(evidence), "utf8");
  console.log(`W-P41 target-owner dry-run evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P41 target-owner dry-run readiness matrix prepared at ${normalizePath(readinessMatrixPath)}`);
  console.log(`W-P41 target-owner evidence review checklist prepared at ${normalizePath(reviewChecklistPath)}`);
  console.log(`W-P41 target-owner dry-run result template prepared at ${normalizePath(resultTemplatePath)}`);
}

function createReadinessMatrix(commandEvidence, handoffEvidence) {
  const matrix = [
    readiness("packet-metadata", "Target owner can identify packet version, target label and review date.", "ready"),
    readiness("policy-confirmation", "Target owner can confirm HIA did not run target commands or mutate target repositories.", "ready"),
    readiness("local-sandbox-summary", "Target owner has a place to report local sandbox success, skip or blocker.", "ready"),
    readiness("branch-pr-summary", "Target owner has a place to report branch and PR status.", "ready"),
    readiness("command-transcript", "Target owner can fill the unified command transcript fields.", "ready"),
    readiness("check-results", "Target owner can summarize build, doc or CI checks without source bodies.", "ready"),
    readiness("provider-review-handoff", "Target owner can review the blocked/refused provider payload as context only.", "ready"),
    readiness("privacy-check", "Target owner can confirm no secrets, source bodies or local paths are included.", "ready"),
    readiness("failure-blocker-shape", "Target owner can classify blocked, failed, rejected or follow-up-required outcomes.", "ready"),
    readiness("adoption-decision", "Target owner can record accept, defer, reject or follow-up decision.", "ready"),
    readiness("follow-up", "Target owner can assign follow-up owner and next action.", "ready"),
    readiness("attachments", "Target owner can list public-safe attachment labels only.", "ready")
  ];

  return {
    contract: "hia-wp41-target-owner-dry-run-readiness-matrix",
    contractVersion: "0.1.0-draft",
    readinessStatus: "ready-for-target-owner-review",
    evidencePacketSectionCount: commandEvidence.evidencePacketTemplate.sections.length,
    commandTranscriptStepCount: commandEvidence.transcriptTemplate.steps.length,
    providerHandoffBindingCount: handoffEvidence.handoffBindings.length,
    items: matrix
  };
}

function readiness(id, purpose, status) {
  return {
    id,
    purpose,
    status,
    targetOwnerActionRequired: true,
    hiaExecutionClaimed: false
  };
}

function createEvidenceReviewChecklist(commandEvidence, handoffEvidence) {
  const sectionChecks = commandEvidence.evidencePacketTemplate.sections.map((section) => ({
    id: `section.${section.id}`,
    category: "evidence-packet-section",
    expected: section.purpose,
    status: "ready-to-review"
  }));
  const transcriptChecks = commandEvidence.transcriptTemplate.steps.map((step) => ({
    id: `transcript.${step.id}`,
    category: "command-transcript-step",
    expected: step.purpose,
    status: "ready-to-review"
  }));
  const handoffChecks = handoffEvidence.handoffBindings.map((binding) => ({
    id: `handoff.${binding.id}`,
    category: "provider-review-handoff",
    expected: binding.purpose,
    status: "review-only-ready"
  }));
  const privacyChecks = commandEvidence.privacyChecklist.map((item) => ({
    id: `privacy.${item.id}`,
    category: "privacy",
    expected: item.purpose,
    status: "required"
  }));

  return {
    contract: "hia-wp41-target-owner-evidence-review-checklist",
    contractVersion: "0.1.0-draft",
    checklistStatus: "ready-for-target-owner-evidence-review",
    sectionChecks,
    transcriptChecks,
    handoffChecks,
    privacyChecks
  };
}

function createDryRunResultTemplate(commandEvidence, handoffEvidence) {
  return {
    contract: "hia-wp41-target-owner-dry-run-result-template",
    contractVersion: "0.1.0-draft",
    templateStatus: "ready-for-target-owner-result-fill",
    sections: [
      templateSection("result-metadata", "Target label, owner, date, packet version and evidence version."),
      templateSection("execution-decision", "Whether target owner ran, skipped, blocked, rejected or deferred the packet."),
      templateSection("sandbox-result", "Local sandbox outcome if target owner ran it."),
      templateSection("branch-pr-result", "Branch and PR outcome if target owner prepared them."),
      templateSection("command-transcript-summary", `${commandEvidence.summary.transcriptStepCount} command steps available for target-owner transcript fill.`),
      templateSection("provider-review-context", `${handoffEvidence.summary.reviewPayloadItemCount} review-only provider item(s) available as context.`),
      templateSection("quality-summary", "Target owner quality notes and failed checks."),
      templateSection("privacy-confirmation", "Confirmation that submitted evidence excludes secrets, source bodies and local paths."),
      templateSection("follow-up-decision", "Target owner decision and next action.")
    ],
    resultShapes: [
      resultShape("not-run", "Target owner has not run the packet."),
      resultShape("dry-run-ready", "Readiness matrix is complete and target owner can choose to run later."),
      resultShape("dry-run-success-submitted", "Target owner reports successful local execution in a later evidence packet."),
      resultShape("dry-run-blocked", "Target owner reports a blocker before or during execution."),
      resultShape("rejected", "Target owner rejects the packet."),
      resultShape("follow-up-required", "Target owner requests follow-up before adoption.")
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

function resultShape(id, meaning) {
  return {
    id,
    meaning,
    producedByHia: false,
    targetOwnerActionRequired: true
  };
}

function summarize({
  commandEvidence,
  dryRunResultTemplate,
  evidenceReviewChecklist,
  handoffEvidence,
  readinessMatrix
}) {
  const publicSurface = {
    dryRunResultTemplate,
    evidenceReviewChecklist,
    readinessMatrix
  };
  return {
    commandEvidenceTemplateReady: commandEvidence.status === "ready-for-provider-review-payload-handoff",
    providerReviewHandoffReady: handoffEvidence.status === "ready-for-target-owner-dry-run-evidence",
    inputHardFailureCount: sum([
      commandEvidence.summary?.hardFailureCount,
      handoffEvidence.summary?.hardFailureCount
    ]),
    targetOwnerActionRequired: true,
    readinessMatrixItemCount: readinessMatrix.items.length,
    evidenceCompletenessCheckCount: evidenceReviewChecklist.sectionChecks.length,
    transcriptStepReviewCount: evidenceReviewChecklist.transcriptChecks.length,
    handoffBindingReviewCount: evidenceReviewChecklist.handoffChecks.length,
    privacyChecklistItemCount: evidenceReviewChecklist.privacyChecks.length,
    dryRunScenarioCount: dryRunResultTemplate.resultShapes.length,
    resultTemplateSectionCount: dryRunResultTemplate.sections.length,
    targetOwnerMaySubmitDryRunEvidence: true,
    hiaMayRunTargetCommands: false,
    hiaMayCreateTargetSandbox: false,
    hiaMayCreateTargetBranch: false,
    hiaMayOpenPullRequest: false,
    hiaMayPushToTargetRemote: false,
    hiaMayModifyTargetRepository: false,
    actualDryRunExecuted: false,
    actualCommandTranscriptSubmitted: false,
    targetCommandsExecutedByHia: false,
    actualTargetSandboxCreated: false,
    actualTargetBranchCreated: false,
    actualPullRequestOpened: false,
    targetOwnerExecutionClaimed: false,
    providerOutputReviewOnly: handoffEvidence.summary.providerOutputReviewOnly === true,
    blockedProviderReviewShapeAccepted: handoffEvidence.summary.blockedProviderReviewShapeAccepted === true,
    providerResultProduced: handoffEvidence.summary.providerResultProduced === true,
    refusalResultProduced: handoffEvidence.summary.refusalResultProduced === true,
    externalNetworkCallExecuted: handoffEvidence.summary.externalNetworkCallExecuted === true,
    realRemoteProviderInvocationExecuted: handoffEvidence.summary.realRemoteProviderInvocationExecuted === true,
    directApplyAllowedCount: Number(commandEvidence.summary?.directApplyAllowedCount ?? 0) + Number(handoffEvidence.summary?.directApplyAllowedCount ?? 0),
    checkedApplyTriggeredCount: Number(commandEvidence.summary?.checkedApplyTriggeredCount ?? 0) + Number(handoffEvidence.summary?.checkedApplyTriggeredCount ?? 0),
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects(publicSurface),
    credentialValueIncludedCount: 0,
    sourceReferenceIncludedCount: 0,
    sourceTextIncludedCount: 0,
    sourcesContentPolicy: "none",
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(publicSurface),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(publicSurface),
    pathExposureCount: countPathExposure(JSON.stringify(publicSurface))
  };
}

function renderReadinessMatrix(evidence) {
  return `# Target-Owner Dry-Run Readiness Matrix

Status: \`${evidence.status}\`

This matrix is a structural dry-run only. HIA has not run target commands, created a target sandbox, created a branch, opened a pull request or contacted a provider.

| Item | Status | Purpose |
| --- | --- | --- |
${evidence.readinessMatrix.items.map((item) => `| ${item.id} | \`${item.status}\` | ${item.purpose} |`).join("\n")}
`;
}

function renderEvidenceReviewChecklist(evidence) {
  const { evidenceReviewChecklist } = evidence;
  const rows = [
    ...evidenceReviewChecklist.sectionChecks,
    ...evidenceReviewChecklist.transcriptChecks,
    ...evidenceReviewChecklist.handoffChecks,
    ...evidenceReviewChecklist.privacyChecks
  ];

  return `# Target-Owner Evidence Review Checklist

Checklist status: \`${evidenceReviewChecklist.checklistStatus}\`

| Check | Category | Status |
| --- | --- | --- |
${rows.map((item) => `| ${item.id} | ${item.category} | \`${item.status}\` |`).join("\n")}
`;
}

function renderDryRunResultTemplate(evidence) {
  const { dryRunResultTemplate } = evidence;
  return `# Target-Owner Dry-Run Result Template

Template status: \`${dryRunResultTemplate.templateStatus}\`

## Sections

${dryRunResultTemplate.sections.map((section) => `### ${section.id}

${section.purpose}

- Result:
- Notes:
`).join("\n")}

## Result Shapes

${dryRunResultTemplate.resultShapes.map((shape) => `- \`${shape.id}\`: ${shape.meaning}`).join("\n")}
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

function sum(values) {
  return values.reduce((total, value) => total + Number(value ?? 0), 0);
}

function assertNoPrivateMarkers(serializedEvidence, label) {
  assert.equal(countPathExposure(serializedEvidence), 0, `${label} must not expose absolute local paths.`);
  assert.equal(countMatches(serializedEvidence, /\b(work-zone|ai\/codex|\.pem|npm_\w+|ghp_)\b/gi), 0, `${label} must not expose private workspace or secret markers.`);
}
