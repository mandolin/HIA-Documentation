import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(rootDir, "dist", "wp41-target-owner-branch-pr-packet");
const evidencePath = path.join(outputRoot, "evidence.json");
const packetPath = path.join(outputRoot, "target-owner-branch-pr-packet.md");
const commandSheetPath = path.join(outputRoot, "target-owner-branch-pr-commands.md");
const prBodyTemplatePath = path.join(outputRoot, "target-owner-pr-body-template.md");
const evidenceTemplatePath = path.join(outputRoot, "target-owner-branch-pr-evidence-template.md");
const localSandboxEvidencePath = path.join(rootDir, "dist", "wp41-target-owner-local-sandbox-packet", "evidence.json");
const targetFlowEvidencePath = path.join(rootDir, "dist", "wp38-target-branch-pr-flow-contract", "evidence.json");

await main();

/**
 * 准备 W-P41.3 target-owner branch/PR packet evidence。
 * Prepare W-P41.3 target-owner branch/PR packet evidence.
 *
 * This packet provides branch naming, commit, pull-request, check and evidence
 * templates for the target owner. HIA automation still does not create
 * branches, push commits, open pull requests, run target checks or mutate any
 * target repository.
 *
 * 中文：本 packet 为目标 owner 准备 branch naming、commit、PR、check 与
 * evidence 模板。HIA automation 仍不创建分支、不 push commit、不打开 PR、
 * 不运行目标检查，也不修改任何目标仓库。
 *
 * @returns {Promise<void>} Writes public-safe W-P41.3 evidence and packet docs.
 */
async function main() {
  const localSandboxEvidence = await readJson(localSandboxEvidencePath);
  const targetFlowEvidence = await readJson(targetFlowEvidencePath);
  const branchPolicy = createBranchPrPolicy(localSandboxEvidence, targetFlowEvidence);
  const branchNaming = createBranchNamingPolicy();
  const commandSheet = createTargetOwnerCommands();
  const checklist = createBranchPrChecklist();
  const prBodyTemplate = createPullRequestBodyTemplate();
  const decisionShapes = createDecisionShapes();
  const evidenceTemplate = createEvidenceTemplate();
  const summary = summarize({
    branchNaming,
    branchPolicy,
    checklist,
    commandSheet,
    decisionShapes,
    evidenceTemplate,
    localSandboxEvidence,
    prBodyTemplate,
    targetFlowEvidence
  });
  const checks = [
    check("HIA_WP41_BRANCH_PR_INPUTS_READY", summary.localSandboxPacketReady === true
      && summary.localSandboxHardFailureCount === 0
      && summary.targetFlowReady === true
      && summary.targetOwnerActionRequired === true, {
      actual: {
        localSandboxHardFailureCount: summary.localSandboxHardFailureCount,
        localSandboxPacketReady: summary.localSandboxPacketReady,
        targetFlowReady: summary.targetFlowReady,
        targetOwnerActionRequired: summary.targetOwnerActionRequired
      }
    }),
    check("HIA_WP41_BRANCH_PR_PACKET_PREPARED", summary.branchPrPacketPrepared === true
      && summary.branchNamingPatternCount >= 3
      && summary.commandTemplateCount >= 8
      && summary.checklistItemCount >= 10
      && summary.prBodySectionCount >= 8
      && summary.evidenceTemplateSectionCount >= 9
      && summary.decisionShapeCount >= 4, {
      actual: {
        branchNamingPatternCount: summary.branchNamingPatternCount,
        checklistItemCount: summary.checklistItemCount,
        commandTemplateCount: summary.commandTemplateCount,
        decisionShapeCount: summary.decisionShapeCount,
        evidenceTemplateSectionCount: summary.evidenceTemplateSectionCount,
        prBodySectionCount: summary.prBodySectionCount
      }
    }),
    check("HIA_WP41_BRANCH_PR_TARGET_OWNER_ONLY", summary.targetOwnerMayCreateBranch === true
      && summary.targetOwnerMayPushBranch === true
      && summary.targetOwnerMayOpenPullRequest === true
      && summary.hiaMayCreateTargetBranch === false
      && summary.hiaMayPushToTargetRemote === false
      && summary.hiaMayOpenPullRequest === false
      && summary.hiaMayRunTargetChecks === false
      && summary.hiaMayModifyTargetRepository === false, {
      actual: {
        hiaMayCreateTargetBranch: summary.hiaMayCreateTargetBranch,
        hiaMayModifyTargetRepository: summary.hiaMayModifyTargetRepository,
        hiaMayOpenPullRequest: summary.hiaMayOpenPullRequest,
        hiaMayPushToTargetRemote: summary.hiaMayPushToTargetRemote,
        hiaMayRunTargetChecks: summary.hiaMayRunTargetChecks,
        targetOwnerMayCreateBranch: summary.targetOwnerMayCreateBranch,
        targetOwnerMayOpenPullRequest: summary.targetOwnerMayOpenPullRequest,
        targetOwnerMayPushBranch: summary.targetOwnerMayPushBranch
      }
    }),
    check("HIA_WP41_BRANCH_PR_NO_EXECUTION_CLAIMED", summary.actualTargetBranchCreated === false
      && summary.actualPullRequestOpened === false
      && summary.actualTargetPushExecuted === false
      && summary.targetChecksExecutedByHia === false
      && summary.targetOwnerExecutionClaimed === false
      && summary.workspaceWriteAllowedCount === 0
      && summary.targetRepositoryMutationCount === 0
      && summary.directEditObjectCount === 0, {
      actual: {
        actualPullRequestOpened: summary.actualPullRequestOpened,
        actualTargetBranchCreated: summary.actualTargetBranchCreated,
        actualTargetPushExecuted: summary.actualTargetPushExecuted,
        directEditObjectCount: summary.directEditObjectCount,
        targetChecksExecutedByHia: summary.targetChecksExecutedByHia,
        targetOwnerExecutionClaimed: summary.targetOwnerExecutionClaimed,
        targetRepositoryMutationCount: summary.targetRepositoryMutationCount,
        workspaceWriteAllowedCount: summary.workspaceWriteAllowedCount
      }
    }),
    check("HIA_WP41_BRANCH_PR_PROVIDER_REVIEW_ONLY", summary.providerOutputReviewOnly === true
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
    check("HIA_WP41_BRANCH_PR_PRIVACY_CLEAN", summary.credentialValueIncludedCount === 0
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
    contract: "hia-wp41-target-owner-branch-pr-packet-evidence",
    contractVersion: "0.1.0-draft",
    createdAt: new Date().toISOString(),
    status: hardFailures.length === 0 ? "ready-for-target-owner-command-evidence-template" : "blocked",
    sourceEvidence: {
      targetOwnerLocalSandboxPacket: normalizePath(localSandboxEvidencePath),
      targetBranchPrFlowContract: normalizePath(targetFlowEvidencePath)
    },
    packetStatus: "ready-for-target-owner-branch-pr-review",
    branchPolicy,
    branchNaming,
    commandSheet,
    checklist,
    prBodyTemplate,
    decisionShapes,
    evidenceTemplate,
    summary: {
      ...summary,
      hardFailureCount: hardFailures.length
    },
    checks,
    generatedDocs: {
      branchPrPacket: normalizePath(packetPath),
      commandSheet: normalizePath(commandSheetPath),
      prBodyTemplate: normalizePath(prBodyTemplatePath),
      evidenceTemplate: normalizePath(evidenceTemplatePath)
    },
    nextContractInputs: [
      {
        phase: "W-P41.4",
        topic: "target-owner-command-and-evidence-template",
        status: "ready-input",
        targetOwnerActionRequired: true,
        reason: "Branch and PR packet now defines target-owned command placeholders and evidence sections for W-P41.4 hardening."
      },
      {
        phase: "W-P41.5",
        topic: "provider-review-payload-handoff",
        status: "ready-after-wp41.4",
        targetOwnerActionRequired: true,
        reason: "PR packet preserves review-only provider result linkage for later handoff into target-owner trials."
      }
    ]
  };
  const serializedEvidence = JSON.stringify(evidence, null, 2);
  assertNoPrivateMarkers(serializedEvidence, "W-P41 target-owner branch/PR packet evidence");
  assert.equal(hardFailures.length, 0, `W-P41 target-owner branch/PR packet has ${hardFailures.length} hard failure(s).`);

  await mkdir(outputRoot, { recursive: true });
  await writeFile(evidencePath, `${serializedEvidence}\n`, "utf8");
  await writeFile(packetPath, renderPacketMarkdown(evidence), "utf8");
  await writeFile(commandSheetPath, renderCommandSheetMarkdown(evidence), "utf8");
  await writeFile(prBodyTemplatePath, renderPrBodyTemplateMarkdown(evidence), "utf8");
  await writeFile(evidenceTemplatePath, renderEvidenceTemplateMarkdown(evidence), "utf8");
  console.log(`W-P41 target-owner branch/PR packet evidence prepared at ${normalizePath(evidencePath)}`);
  console.log(`W-P41 target-owner branch/PR packet prepared at ${normalizePath(packetPath)}`);
  console.log(`W-P41 target-owner branch/PR commands prepared at ${normalizePath(commandSheetPath)}`);
  console.log(`W-P41 target-owner PR body template prepared at ${normalizePath(prBodyTemplatePath)}`);
  console.log(`W-P41 target-owner branch/PR evidence template prepared at ${normalizePath(evidenceTemplatePath)}`);
}

function createBranchPrPolicy(localSandboxEvidence, targetFlowEvidence) {
  return {
    contract: "hia-wp41-target-owner-branch-pr-policy",
    contractVersion: "0.1.0-draft",
    sourceLocalSandboxPacket: localSandboxEvidence.contract,
    sourceTargetFlowContract: targetFlowEvidence.contract,
    targetOwnerActionRequired: true,
    targetOwnerMayCreateBranch: true,
    targetOwnerMayPushBranch: true,
    targetOwnerMayOpenPullRequest: true,
    targetOwnerMayRunChecks: true,
    hiaMayCreateTargetBranch: false,
    hiaMayPushToTargetRemote: false,
    hiaMayOpenPullRequest: false,
    hiaMayRunTargetChecks: false,
    hiaMayModifyTargetRepository: false,
    branchPrMode: "target-owner-controlled-after-local-sandbox-review",
    providerOutputPolicy: "review-only",
    sourcesContentPolicy: "none"
  };
}

function createBranchNamingPolicy() {
  return {
    contract: "hia-wp41-branch-naming-policy",
    contractVersion: "0.1.0-draft",
    patterns: [
      pattern("documentation-adoption", "docs/hia-adoption-<short-topic>"),
      pattern("documentation-fix", "docs/hia-doc-fix-<short-topic>"),
      pattern("documentation-experiment", "docs/hia-sandbox-<short-topic>")
    ],
    rules: [
      "Use a target-owner-controlled branch.",
      "Keep the branch narrow and documentation-focused.",
      "Do not include secrets, generated private artifacts or unreviewed source body in public evidence."
    ]
  };
}

function pattern(id, template) {
  return { id, template };
}

function createTargetOwnerCommands() {
  return [
    command("review-local-sandbox-evidence", "Review W-P41.2 local sandbox evidence before branch work.", "<open-local-sandbox-evidence>"),
    command("create-target-branch", "Create a target-owned documentation branch.", "git switch -c docs/hia-adoption-<short-topic>"),
    command("copy-approved-artifacts", "Copy target-owner-approved documentation artifacts or config changes.", "<copy-approved-documentation-artifacts>"),
    command("stage-reviewed-changes", "Stage only target-owner-reviewed documentation changes.", "git add <reviewed-documentation-files>"),
    command("commit-reviewed-changes", "Commit reviewed documentation changes.", "git commit -m \"docs: adopt hia documentation packet\""),
    command("run-target-checks", "Run target-owner-selected documentation or CI checks.", "<target-owner-check-command>"),
    command("push-target-branch", "Push the branch from the target owner's environment.", "git push -u origin docs/hia-adoption-<short-topic>"),
    command("open-target-pr", "Open a pull request using the PR body template.", "<target-owner-open-pr-command>"),
    command("capture-branch-pr-evidence", "Record branch, PR, checks and adoption decision in the evidence template.", "<capture-target-owner-branch-pr-evidence>")
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

function createBranchPrChecklist() {
  return [
    item("local-sandbox-reviewed", "W-P41.2 local sandbox packet and evidence reviewed."),
    item("branch-owned-by-target", "Branch created by target owner only."),
    item("changes-reviewed", "All staged changes reviewed by target owner."),
    item("no-private-artifacts", "No private generated artifacts or credential material staged."),
    item("no-source-body-in-evidence", "Public evidence avoids embedding source body."),
    item("checks-selected", "Target owner selected appropriate documentation and CI checks."),
    item("checks-recorded", "Check results recorded in target-owner evidence."),
    item("pr-body-complete", "PR body includes evidence link, summary, risk and rollback notes."),
    item("reviewers-selected", "Reviewers are chosen by target owner."),
    item("merge-decision-owned-by-target", "Merge, close or revise decision stays with target owner.")
  ];
}

function item(id, purpose) {
  return {
    id,
    purpose,
    required: true
  };
}

function createPullRequestBodyTemplate() {
  return {
    contract: "hia-wp41-target-owner-pr-body-template",
    contractVersion: "0.1.0-draft",
    sections: [
      section("summary", "Short target-owner summary of the documentation adoption."),
      section("hia-packet", "HIA packet version and evidence references."),
      section("local-sandbox-review", "W-P41.2 local sandbox review result."),
      section("changed-scope", "Documentation files, generated artifacts or config touched by target owner."),
      section("checks", "Target-owner check commands and results."),
      section("privacy", "No credential material, private source body or local absolute path in public evidence."),
      section("provider-review", "Provider review payload remains review-only."),
      section("risks", "Known risks, blocked items or follow-up work."),
      section("rollback", "Rollback or close-without-merge plan."),
      section("decision", "Target owner requested decision: review, merge, close or follow-up.")
    ]
  };
}

function section(id, purpose) {
  return {
    id,
    purpose,
    required: true
  };
}

function createDecisionShapes() {
  return [
    decision("ready-for-review", "Target owner opened or plans to open a PR for review."),
    decision("blocked-before-branch", "Target owner did not create a branch because prerequisites failed."),
    decision("blocked-before-pr", "Target owner created or prepared a branch but did not open a PR."),
    decision("rejected", "Target owner rejected the packet after local review."),
    decision("follow-up-required", "Target owner needs another HIA packet or manual clarification.")
  ];
}

function decision(id, meaning) {
  return {
    id,
    meaning,
    targetOwnerActionRequired: true,
    createdByHia: false
  };
}

function createEvidenceTemplate() {
  return {
    contract: "hia-wp41-target-owner-branch-pr-evidence-template",
    contractVersion: "0.1.0-draft",
    sections: [
      section("target-owner", "Target owner and reviewer labels."),
      section("branch", "Branch name, creation owner and creation status."),
      section("commit", "Commit status and summary if a commit was made by target owner."),
      section("checks", "Documentation or CI check command summaries."),
      section("pull-request", "PR status, link label or blocked-before-PR reason."),
      section("provider-review", "Review-only provider payload handoff status."),
      section("privacy", "Confirmation that public evidence is source-body-free and credential-free."),
      section("decision", "Ready, blocked, rejected or follow-up decision."),
      section("follow-up", "Next action owned by target owner or HIA.")
    ]
  };
}

function summarize({
  branchNaming,
  branchPolicy,
  checklist,
  commandSheet,
  decisionShapes,
  evidenceTemplate,
  localSandboxEvidence,
  prBodyTemplate,
  targetFlowEvidence
}) {
  const packetSurface = {
    branchNaming,
    branchPolicy,
    checklist,
    commandSheet,
    decisionShapes,
    evidenceTemplate,
    prBodyTemplate
  };
  return {
    localSandboxPacketReady: localSandboxEvidence.status === "ready-for-target-owner-branch-pr-packet",
    localSandboxHardFailureCount: Number(localSandboxEvidence.summary?.hardFailureCount ?? -1),
    targetFlowReady: targetFlowEvidence.status === "ready-for-devtools-visual-studio-confirmation-parity",
    targetOwnerActionRequired: branchPolicy.targetOwnerActionRequired,
    branchPrPacketPrepared: true,
    branchNamingPatternCount: branchNaming.patterns.length,
    commandTemplateCount: commandSheet.length,
    checklistItemCount: checklist.length,
    prBodySectionCount: prBodyTemplate.sections.length,
    evidenceTemplateSectionCount: evidenceTemplate.sections.length,
    decisionShapeCount: decisionShapes.length,
    targetOwnerMayCreateBranch: branchPolicy.targetOwnerMayCreateBranch,
    targetOwnerMayPushBranch: branchPolicy.targetOwnerMayPushBranch,
    targetOwnerMayOpenPullRequest: branchPolicy.targetOwnerMayOpenPullRequest,
    hiaMayCreateTargetBranch: branchPolicy.hiaMayCreateTargetBranch,
    hiaMayPushToTargetRemote: branchPolicy.hiaMayPushToTargetRemote,
    hiaMayOpenPullRequest: branchPolicy.hiaMayOpenPullRequest,
    hiaMayRunTargetChecks: branchPolicy.hiaMayRunTargetChecks,
    hiaMayModifyTargetRepository: branchPolicy.hiaMayModifyTargetRepository,
    actualTargetBranchCreated: false,
    actualPullRequestOpened: false,
    actualTargetPushExecuted: false,
    targetChecksExecutedByHia: false,
    targetOwnerExecutionClaimed: false,
    providerOutputReviewOnly: localSandboxEvidence.summary?.providerOutputReviewOnly === true,
    blockedProviderReviewShapeAccepted: localSandboxEvidence.summary?.blockedProviderReviewShapeAccepted === true,
    providerResultProduced: localSandboxEvidence.summary?.providerResultProduced === true,
    refusalResultProduced: localSandboxEvidence.summary?.refusalResultProduced === true,
    checkedApplyTriggeredCount: Number(localSandboxEvidence.summary?.checkedApplyTriggeredCount ?? 0),
    directApplyAllowedCount: Number(localSandboxEvidence.summary?.directApplyAllowedCount ?? 0),
    workspaceWriteAllowedCount: 0,
    targetRepositoryMutationCount: 0,
    directEditObjectCount: countDirectEditObjects(packetSurface),
    credentialValueIncludedCount: 0,
    sourceReferenceIncludedCount: 0,
    sourceTextIncludedCount: 0,
    sourcesContentPolicy: branchPolicy.sourcesContentPolicy,
    credentialMaterialMarkerCount: countCredentialMaterialMarkers(packetSurface),
    forbiddenDocumentTextMarkerCount: countForbiddenDocumentTextMarkers(packetSurface),
    pathExposureCount: countPathExposure(JSON.stringify(packetSurface))
  };
}

function renderPacketMarkdown(evidence) {
  return `# W-P41.3 Target-Owner Branch/PR Packet

## Status

- Evidence status: \`${evidence.status}\`
- Packet status: \`${evidence.packetStatus}\`
- Next phase: \`W-P41.4 target-owner-command-and-evidence-template\`

## Boundary

- Target owner action required: ${String(evidence.summary.targetOwnerActionRequired)}
- HIA creates target branch: ${String(evidence.summary.hiaMayCreateTargetBranch)}
- HIA opens pull request: ${String(evidence.summary.hiaMayOpenPullRequest)}
- HIA pushes target remote: ${String(evidence.summary.hiaMayPushToTargetRemote)}
- Actual branch / PR / push in this evidence: ${String(evidence.summary.actualTargetBranchCreated)} / ${String(evidence.summary.actualPullRequestOpened)} / ${String(evidence.summary.actualTargetPushExecuted)}

## Branch Naming

${evidence.branchNaming.patterns.map((entry) => `- \`${entry.id}\`: \`${entry.template}\``).join("\n")}

## Checklist

${evidence.checklist.map((entry) => `- ${entry.purpose}`).join("\n")}

## Templates

- Commands: \`${evidence.generatedDocs.commandSheet}\`
- PR body: \`${evidence.generatedDocs.prBodyTemplate}\`
- Evidence: \`${evidence.generatedDocs.evidenceTemplate}\`
`;
}

function renderCommandSheetMarkdown(evidence) {
  return `# Target-Owner Branch/PR Commands

These commands are templates for the target owner. HIA automation did not run them.

${evidence.commandSheet.map((entry, index) => `${index + 1}. ${entry.purpose}

\`\`\`powershell
${entry.template}
\`\`\``).join("\n\n")}
`;
}

function renderPrBodyTemplateMarkdown(evidence) {
  return `# Target-Owner PR Body Template

${evidence.prBodyTemplate.sections.map((entry) => `## ${entry.id}

${entry.purpose}

- Content:`).join("\n\n")}
`;
}

function renderEvidenceTemplateMarkdown(evidence) {
  return `# Target-Owner Branch/PR Evidence Template

Fill this template only after the target owner creates a branch, pushes it or opens a PR.

${evidence.evidenceTemplate.sections.map((entry) => `## ${entry.id}

${entry.purpose}

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
